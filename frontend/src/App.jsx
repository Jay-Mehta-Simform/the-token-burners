import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { setRepos, setCurrentUser, mergePulls, repos } from './data/seed.js'
import { findRepo } from './lib/derive.js'
import { normalizeProject, normalizeAnalysis } from './lib/normalize.js'
import {
  getCurrentUser,
  logout as apiLogout,
  beginGithubOAuth,
  listProjects,
  resyncProjects,
  listPulls,
  triggerAnalysis as apiTriggerAnalysis,
  provideSpec as apiProvideSpec,
  getAnalysis,
  saveAnswer as apiSaveAnswer,
  submitAnalysis as apiSubmitAnalysis,
  retriggerAnalysis as apiRetriggerAnalysis,
  exportUrl,
} from './api/client.js'
import Login from './pages/Login.jsx'
import Sidebar from './components/Sidebar.jsx'
import Header from './components/Header.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import AnalysisWorkspace from './pages/AnalysisWorkspace.jsx'
import PRGlobal from './pages/PRGlobal.jsx'
import ReportsGlobal from './pages/ReportsGlobal.jsx'
import ReportDetail from './pages/ReportDetail.jsx'
import Insights from './pages/Insights.jsx'
import Settings from './pages/Settings.jsx'

// Central app state + actions, now backed by the real backend API
// (see src/api/client.js). Drives login → projects → PR → analysis →
// decision-record. Analyses are keyed by `${projectId}#${prNumber}`; the
// backend's UUID analysis id is tracked alongside in `analysisIds`.
const POLL_MS = 2000
// Statuses at which the pipeline is settled and polling can stop.
const TERMINAL = ['ready', 'questions_ready', 'completed', 'failed']

function useAppState() {
  const [state, setState] = useState({
    ready: false, // bootstrap (session check) finished
    auth: false,
    user: '',
    page: 'projects',
    view: null,
    analyses: {},
    analysisIds: {},
    specDraft: '',
    rev: 0, // bump to force re-render after mutating the seed caches
  })

  // Refs mirror state for use inside async callbacks / timers.
  const stateRef = useRef(state)
  stateRef.current = state
  const idsRef = useRef({})
  const pollers = useRef({})
  const answerTimers = useRef({})

  const patch = useCallback(
    (p) => setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })),
    []
  )
  const bump = useCallback(() => setState((s) => ({ ...s, rev: s.rev + 1 })), [])
  const setAnalysis = useCallback(
    (key, data) =>
      setState((s) => ({
        ...s,
        analyses: { ...s.analyses, [key]: { ...(s.analyses[key] || {}), ...data } },
      })),
    []
  )

  const stopPoll = useCallback((key) => {
    if (pollers.current[key]) {
      clearInterval(pollers.current[key])
      delete pollers.current[key]
    }
  }, [])

  // Poll GET /api/analyses/:id until it reaches a terminal status.
  const poll = useCallback(
    (key, id) => {
      stopPoll(key)
      const tick = async () => {
        try {
          const api = await getAnalysis(id)
          const norm = normalizeAnalysis(api)
          setAnalysis(key, norm)
          if (TERMINAL.includes(norm.status)) stopPoll(key)
        } catch (e) {
          stopPoll(key)
          setAnalysis(key, {
            status: 'failed',
            errorMessage: 'Failed to fetch analysis status: ' + e.message,
          })
        }
      }
      pollers.current[key] = setInterval(tick, POLL_MS)
      tick()
    },
    [setAnalysis, stopPoll]
  )

  // Load open PRs for a repo into the shared cache and update its PR count.
  const loadPulls = useCallback(
    async (projectId) => {
      try {
        const pulls = await listPulls(projectId)
        mergePulls(projectId, pulls)
        setRepos(
          repos().map((r) =>
            r.id === projectId ? { ...r, openPRs: (pulls || []).length } : r
          )
        )
        bump()
      } catch {
        /* leave PR list empty for this repo */
      }
    },
    [bump]
  )

  // Background: warm the PR cache (and counts) for the projects list + global
  // PR table. Capped to avoid hammering GitHub for very large accounts.
  const prefetchPulls = useCallback(
    async (projects) => {
      for (const p of (projects || []).slice(0, 30)) {
        await loadPulls(p.id)
      }
    },
    [loadPulls]
  )

  const loadProjects = useCallback(async () => {
    try {
      let list = await listProjects()
      if (!Array.isArray(list)) list = []
      if (list.length === 0) {
        try {
          list = await resyncProjects()
        } catch {
          list = []
        }
      }
      const normalized = (list || []).map(normalizeProject)
      setRepos(normalized)
      bump()
      prefetchPulls(normalized)
    } catch {
      setRepos([])
      bump()
    }
  }, [bump, prefetchPulls])

  // Bootstrap: check the session, then load projects.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await getCurrentUser()
        if (cancelled) return
        setCurrentUser(me.github_login || '')
        patch({ auth: true, user: me.github_login || '', ready: true })
        loadProjects()
      } catch {
        if (!cancelled) patch({ auth: false, ready: true })
      }
    })()
    const pollMap = pollers.current
    return () => {
      cancelled = true
      Object.keys(pollMap).forEach((k) => {
        clearInterval(pollMap[k])
        delete pollMap[k]
      })
    }
  }, [patch, loadProjects])

  // Flush any debounced answer saves for a key, then resolve.
  const flushAnswers = useCallback(async (key) => {
    const a = stateRef.current.analyses[key]
    const id = idsRef.current[key]
    if (!a || !id) return
    Object.keys(answerTimers.current).forEach((tk) => {
      if (tk.startsWith(key + '|')) {
        clearTimeout(answerTimers.current[tk])
        delete answerTimers.current[tk]
      }
    })
    await Promise.all(
      (a.gaps || [])
        .filter((g) => g.questionId && g.answer && g.answer.trim())
        .map((g) => apiSaveAnswer(id, g.questionId, g.answer).catch(() => {}))
    )
  }, [])

  const actions = useMemo(
    () => ({
      login: () => beginGithubOAuth(),

      logout: async () => {
        try {
          await apiLogout()
        } catch {
          /* ignore */
        }
        setCurrentUser('')
        Object.keys(pollers.current).forEach(stopPoll)
        idsRef.current = {}
        patch({ auth: false, user: '', view: null, page: 'projects', analyses: {}, analysisIds: {} })
      },

      go: (page) => patch({ page, view: null }),
      openProject: (id, tab) => {
        patch({ view: { type: 'project', id, tab: tab || 'prs' } })
        window.scrollTo(0, 0)
        loadPulls(id)
      },
      setTab: (tab) => patch((s) => ({ view: { ...s.view, tab } })),
      openAnalysis: (key) => {
        patch({ view: { type: 'analysis', key }, specDraft: '' })
        window.scrollTo(0, 0)
        // Refresh from the server if we already have this analysis tracked.
        const id = idsRef.current[key]
        if (id) {
          getAnalysis(id)
            .then((api) => setAnalysis(key, normalizeAnalysis(api)))
            .catch(() => {})
        }
      },
      openReport: (key) => {
        patch({ view: { type: 'report', key } })
        window.scrollTo(0, 0)
      },
      back: () =>
        setState((s) => {
          const v = s.view
          if (v && (v.type === 'analysis' || v.type === 'report')) {
            const repoId = v.key.split('#')[0]
            if (findRepo(repoId)) {
              window.scrollTo(0, 0)
              return { ...s, view: { type: 'project', id: repoId, tab: v.type === 'report' ? 'analyses' : 'prs' } }
            }
          }
          return { ...s, view: null }
        }),

      setSpecDraft: (specDraft) => patch({ specDraft }),

      resync: async () => {
        try {
          const list = await resyncProjects()
          const normalized = (list || []).map(normalizeProject)
          setRepos(normalized)
          bump()
          prefetchPulls(normalized)
        } catch {
          /* ignore */
        }
      },

      // Trigger (or re-trigger) an analysis, then poll for status.
      triggerAnalysis: async (key) => {
        const [projectId, prNumberStr] = key.split('#')
        const prNumber = parseInt(prNumberStr, 10)
        const existingId = idsRef.current[key]
        const cur = stateRef.current.analyses[key]
        const isRetrigger =
          existingId && cur && (cur.status === 'failed' || cur.status === 'completed' || cur.isStale)

        setAnalysis(key, {
          status: 'analyzing',
          isStale: false,
          errorMessage: '',
          gaps: [],
          reverseSpec: '',
          spec: '',
          respondent: stateRef.current.user,
          when: 'just now',
        })

        try {
          if (isRetrigger) {
            await apiRetriggerAnalysis(existingId)
            poll(key, existingId)
          } else {
            const res = await apiTriggerAnalysis({ projectId, prNumber })
            const id = res.analysis_id
            idsRef.current[key] = id
            patch((s) => ({ analysisIds: { ...s.analysisIds, [key]: id } }))
            poll(key, id)
          }
        } catch (e) {
          const msg = String(e.message || '')
          setAnalysis(key, {
            status: 'failed',
            errorMessage: msg.includes('409')
              ? 'An analysis is already in progress for this PR.'
              : 'Failed to start analysis: ' + msg,
          })
        }
      },

      // Provide the original spec → run gap analysis + question generation.
      provideSpec: async (key) => {
        const id = idsRef.current[key]
        const draft = stateRef.current.specDraft
        if (!id || !draft || !draft.trim()) return
        setAnalysis(key, { status: 'comparing', spec: draft })
        try {
          await apiProvideSpec(id, draft)
          poll(key, id)
        } catch (e) {
          setAnalysis(key, {
            status: 'failed',
            errorMessage: 'Failed to start comparison: ' + String(e.message || ''),
          })
        }
      },

      // Optimistic local update + debounced save of a single answer.
      answerQuestion: (key, gapId, val) => {
        setState((s) => {
          const a = s.analyses[key]
          if (!a) return s
          const gaps = a.gaps.map((g) => (g.id === gapId ? { ...g, answer: val } : g))
          return { ...s, analyses: { ...s.analyses, [key]: { ...a, gaps } } }
        })
        const id = idsRef.current[key]
        const a = stateRef.current.analyses[key]
        const gap = a && a.gaps.find((g) => g.id === gapId)
        const qid = gap && gap.questionId
        if (!id || !qid) return
        const tkey = key + '|' + gapId
        clearTimeout(answerTimers.current[tkey])
        answerTimers.current[tkey] = setTimeout(() => {
          // backend rejects empty answers (min length 1); only persist non-empty.
          if (val && val.trim()) apiSaveAnswer(id, qid, val).catch(() => {})
        }, 500)
      },

      submitAnalysis: async (key) => {
        const a = stateRef.current.analyses[key]
        const id = idsRef.current[key]
        if (!a || !id) return
        if (a.gaps.some((g) => !g.answer || !g.answer.trim())) return
        try {
          await flushAnswers(key)
          await apiSubmitAnalysis(id)
          const api = await getAnalysis(id)
          setAnalysis(key, normalizeAnalysis(api))
        } catch (e) {
          // Surface server-side gate failures (e.g. 422) without losing answers.
          setAnalysis(key, {
            errorMessage: 'Submit failed: ' + String(e.message || ''),
          })
        }
      },

      // Stream the Decision Record markdown straight from the server.
      exportAnalysis: (key) => {
        const id = idsRef.current[key]
        if (id) window.location = exportUrl(id)
      },
    }),
    [patch, bump, setAnalysis, stopPoll, poll, loadPulls, prefetchPulls, flushAnswers]
  )

  return { state, actions }
}

export default function App() {
  const { state, actions } = useAppState()

  if (!state.ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ink)', color: '#C6C6C6', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
        Loading…
      </div>
    )
  }

  if (!state.auth) return <Login onLogin={actions.login} />

  const { view, page } = state
  const base = !view

  let content = null
  if (base && page === 'projects') content = <Projects state={state} actions={actions} />
  else if (base && page === 'pr') content = <PRGlobal state={state} actions={actions} />
  else if (base && page === 'reports') content = <ReportsGlobal state={state} actions={actions} />
  else if (base && page === 'insights') content = <Insights state={state} actions={actions} />
  else if (base && page === 'settings') content = <Settings state={state} actions={actions} />
  else if (view && view.type === 'project') content = <ProjectDetail state={state} actions={actions} />
  else if (view && view.type === 'analysis') content = <AnalysisWorkspace state={state} actions={actions} />
  else if (view && view.type === 'report') content = <ReportDetail state={state} actions={actions} />

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar state={state} actions={actions} />
      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <Header state={state} actions={actions} />
        <main style={{ flex: 1, padding: '26px 28px 64px', minWidth: 0 }}>
          {content}
        </main>
      </div>
    </div>
  )
}
