import React, { useCallback, useMemo, useRef, useState } from 'react'
import { seedAnalyses, synthReverseSpec, synthGaps, CURRENT_USER } from './data/seed.js'
import { findRepo } from './lib/derive.js'
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

// Central app state + actions. Mirrors the design prototype's DCLogic component:
// a single in-memory store driving login → projects → PR → analysis → decision-record.
// Every mutation below has a "// BACKEND:" note pointing at the API call that
// replaces the local fixture behaviour (see src/api/client.js).
function useAppState() {
  const [state, setState] = useState({
    auth: false,
    page: 'projects',
    view: null,
    search: '',
    analyses: seedAnalyses(),
    specDraft: '',
  })
  const timers = useRef({})

  const patch = useCallback((p) => setState((s) => ({ ...s, ...(typeof p === 'function' ? p(s) : p) })), [])

  const actions = useMemo(() => ({
    // BACKEND: beginGithubOAuth() — redirect to /auth/github.
    login: () => patch({ auth: true }),
    logout: () => patch({ auth: false, view: null, page: 'projects' }),

    go: (page) => patch({ page, view: null }),
    openProject: (id, tab) => { patch({ view: { type: 'project', id, tab: tab || 'overview' } }); window.scrollTo(0, 0) },
    setTab: (tab) => patch((s) => ({ view: { ...s.view, tab } })),
    openAnalysis: (key) => { patch({ view: { type: 'analysis', key }, specDraft: '' }); window.scrollTo(0, 0) },
    openReport: (key) => { patch({ view: { type: 'report', key } }); window.scrollTo(0, 0) },
    back: () => setState((s) => {
      const v = s.view
      if (v && (v.type === 'analysis' || v.type === 'report')) {
        const repoId = v.key.split('#')[0]
        if (findRepo(repoId)) { window.scrollTo(0, 0); return { ...s, view: { type: 'project', id: repoId, tab: v.type === 'report' ? 'analyses' : 'prs' } } }
      }
      return { ...s, view: null }
    }),

    setSearch: (search) => patch({ search }),
    setSpecDraft: (specDraft) => patch({ specDraft }),
    resync: () => patch((s) => ({ ...s })), // BACKEND: resyncProjects()

    // BACKEND: triggerAnalysis() then poll getAnalysis() until status leaves "analyzing".
    triggerAnalysis: (key) => {
      patch((s) => ({ specDraft: '', analyses: { ...s.analyses, [key]: { ...(s.analyses[key] || {}), status: 'analyzing', isStale: false, respondent: CURRENT_USER, when: 'just now', gaps: [], reverseSpec: '' } } }))
      clearTimeout(timers.current.t1)
      timers.current.t1 = setTimeout(() => {
        setState((s) => {
          const cur = s.analyses[key] || {}
          return { ...s, analyses: { ...s.analyses, [key]: { ...cur, reverseSpec: synthReverseSpec(), status: 'ready', isStale: false, gaps: [] } } }
        })
      }, 2200)
    },

    // BACKEND: provideSpec() then poll getAnalysis() until status === "questions_ready".
    provideSpec: (key) => {
      patch((s) => ({ analyses: { ...s.analyses, [key]: { ...s.analyses[key], status: 'comparing' } } }))
      clearTimeout(timers.current.t2)
      timers.current.t2 = setTimeout(() => {
        setState((s) => ({ ...s, analyses: { ...s.analyses, [key]: { ...s.analyses[key], ...synthGaps(), status: 'questions_ready' } } }))
      }, 2000)
    },

    // BACKEND: saveAnswer(analysisId, questionId, value)
    answerQuestion: (key, gapId, val) => patch((s) => {
      const a = s.analyses[key]
      if (!a) return {}
      const gaps = a.gaps.map((g) => (g.id === gapId ? { ...g, answer: val } : g))
      return { analyses: { ...s.analyses, [key]: { ...a, gaps } } }
    }),

    // BACKEND: submitAnalysis(analysisId) — server re-validates all answered.
    submitAnalysis: (key) => setState((s) => {
      const a = s.analyses[key]
      if (!a || a.gaps.some((g) => !g.answer || !g.answer.trim())) return s
      return { ...s, analyses: { ...s.analyses, [key]: { ...a, status: 'completed', isStale: false, respondent: CURRENT_USER, when: 'just now' } } }
    }),
  }), [patch])

  return { state, actions }
}

export default function App() {
  const { state, actions } = useAppState()

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
