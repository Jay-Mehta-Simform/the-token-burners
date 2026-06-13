import React from 'react'
import Icon from '../lib/Icon.jsx'
import Hov from '../lib/Hov.jsx'
import { C, StatePill, GapChip, sevCounts } from '../lib/meta.jsx'
import { repos, prs } from '../data/seed.js'
import { prKey, ctaFor, findRepo } from '../lib/derive.js'

export default function ProjectDetail({ state, actions }) {
  const { view, analyses } = state
  const r = findRepo(view.id) || repos()[0]
  const tab = view.tab || 'overview'

  const repoPRs = prs().filter((p) => p.repoId === r.id)
  const repoAnalysisKeys = Object.keys(analyses).filter((k) => k.split('#')[0] === r.id)
  const reportCountForRepo = repoAnalysisKeys.filter((k) => analyses[k].status === 'completed').length
  const openGaps = repoAnalysisKeys.reduce((n, k) => n + (analyses[k].status === 'questions_ready' ? (analyses[k].gaps || []).length : 0), 0)

  const statusFor = (p) => { const a = analyses[prKey(p)]; return a ? a.status : 'none' }

  const tabDef = [
    { id: 'overview', label: 'Overview', badge: null },
    { id: 'prs', label: 'Pull Requests', badge: String(r.openPRs) },
    { id: 'analyses', label: 'Analyses & Reports', badge: repoAnalysisKeys.length ? String(repoAnalysisKeys.length) : null },
    { id: 'settings', label: 'Settings', badge: null },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--t-muted)', display: 'inline-flex' }}><Icon name="repo" /></span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 20, fontWeight: 600, color: 'var(--t-strong)', whiteSpace: 'nowrap' }}>{r.owner}/<span style={{ color: 'var(--coral)' }}>{r.name}</span></span>
          <Hov as="a" href={`https://github.com/${r.owner}/${r.name}`} target="_blank" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-muted)', textDecoration: 'none', border: '1px solid var(--hairline)', padding: '4px 9px', borderRadius: 5 }} hoverStyle={{ color: 'var(--coral)', borderColor: 'var(--coral)' }}><Icon name="external" size={13} /> GitHub</Hov>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} /> Synced {r.synced}</span>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--t-muted)', margin: '8px 0 0', paddingLeft: 31 }}>{r.desc}</p>
      </div>

      <div style={{ display: 'flex', gap: 2, borderBottom: '1.5px solid var(--hairline)' }}>
        {tabDef.map((t) => {
          const active = tab === t.id
          return (
            <Hov key={t.id} onClick={() => actions.setTab(t.id)}
              style={{ display: 'inline-flex', alignItems: 'center', padding: '11px 15px', fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: active ? 700 : 500, color: active ? C.coralDeep : C.muted, cursor: 'pointer', borderBottom: active ? `2px solid ${C.coral}` : '2px solid transparent', marginBottom: '-1.5px' }}
              hoverStyle={active ? {} : { color: C.strong }}>
              {t.label}
              {t.badge != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, marginLeft: 7, background: active ? C.coral : C.surface, color: active ? '#fff' : C.muted, borderRadius: 3, padding: '0 6px' }}>{t.badge}</span>}
            </Hov>
          )
        })}
      </div>

      {tab === 'overview' && (
        <Overview r={r} repoPRs={repoPRs} repoAnalysisKeys={repoAnalysisKeys} reportCountForRepo={reportCountForRepo} openGaps={openGaps} statusFor={statusFor} state={state} actions={actions} />
      )}
      {tab === 'prs' && <PRsTab repoPRs={repoPRs} statusFor={statusFor} actions={actions} />}
      {tab === 'analyses' && <AnalysesTab r={r} repoAnalysisKeys={repoAnalysisKeys} analyses={analyses} actions={actions} />}
      {tab === 'settings' && <RepoSettings r={r} />}
    </div>
  )
}

function PRStatePillRow({ p, statusFor }) { return <StatePill status={statusFor(p)} /> }

function Overview({ r, repoPRs, repoAnalysisKeys, reportCountForRepo, openGaps, statusFor, analyses, actions, state }) {
  const A = state.analyses
  const stats = [
    { label: 'Open PRs', value: String(r.openPRs), color: C.strong },
    { label: 'Analyses', value: String(repoAnalysisKeys.length), color: C.strong },
    { label: 'Open gaps', value: String(openGaps), color: openGaps ? C.coral : C.green },
    { label: 'Drift reports', value: String(reportCountForRepo), color: C.strong },
  ]
  const overviewAnalyses = repoAnalysisKeys.slice(0, 3).map((k) => ({ key: k, prNumber: k.split('#')[1], when: A[k].when, status: A[k].status }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ flex: '1 1 160px', minWidth: 150, background: 'var(--surface)', border: '1px solid var(--hairline)', padding: '15px 17px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--t-muted)' }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', marginTop: 6, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '1.3 1 360px', minWidth: 0, background: 'var(--paper)', border: '1px solid var(--hairline)' }}>
          <div style={{ padding: '15px 18px 12px', borderBottom: '1.5px solid var(--hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>Open pull requests</span>
            <span onClick={() => actions.setTab('prs')} style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--coral)', cursor: 'pointer' }}>VIEW ALL →</span>
          </div>
          {repoPRs.slice(0, 4).map((p) => (
            <Hov key={prKey(p)} onClick={() => actions.openAnalysis(prKey(p))} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: '1px solid var(--hairline)', cursor: 'pointer' }} hoverStyle={{ background: 'var(--surface)' }}>
              <span style={{ color: 'var(--t-muted)', display: 'inline-flex' }}><Icon name="pr" size={16} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: 13.5, color: 'var(--t-strong)', fontWeight: 600 }}>{p.title}</span>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-muted)', marginTop: 2 }}>#{p.number} · {p.author} · {p.branch}</div>
              </div>
              <PRStatePillRow p={p} statusFor={statusFor} />
            </Hov>
          ))}
        </div>
        <div style={{ flex: '1 1 260px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral)', padding: '16px 18px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--coral)' }}>RECENT ANALYSES</div>
          {overviewAnalyses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 10 }}>
              {overviewAnalyses.map((a) => (
                <div key={a.key} onClick={() => actions.openAnalysis(a.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid var(--hairline)', cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>PR #{a.prNumber}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>{a.when}</div>
                  </div>
                  <div style={{ flex: '0 0 auto' }}><StatePill status={a.status} /></div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--t-muted)', margin: '10px 0 0', lineHeight: 1.5 }}>No analyses yet. Open a pull request and click Analyze to start.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PRsTab({ repoPRs, statusFor, actions }) {
  const cols = '2.6fr 1.3fr 1.1fr 1.3fr 1fr'
  const Head = ({ children, right }) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-muted)', textAlign: right ? 'right' : 'left' }}>{children}</span>
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '10px 18px', background: 'var(--surface)', borderBottom: '1.5px solid var(--hairline)' }}>
        <Head>Pull Request</Head><Head>Author</Head><Head>Changes</Head><Head>Analysis</Head><Head right>Action</Head>
      </div>
      {repoPRs.map((p) => {
        const cta = ctaFor(statusFor(p))
        return (
          <Hov key={prKey(p)} style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--hairline)' }} hoverStyle={{ background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ color: 'var(--t-muted)', display: 'inline-flex' }}><Icon name="pr" size={16} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>#{p.number} · {p.branch}</div>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t-body)' }}>{p.author}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-muted)' }}><span style={{ color: 'var(--green)' }}>+{p.add}</span> <span style={{ color: 'var(--coral-deep)' }}>−{p.del}</span></span>
            <div><StatePill status={statusFor(p)} /></div>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => actions.openAnalysis(prKey(p))} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: `1px solid ${cta.ctaBorder}`, background: cta.ctaBg, borderRadius: 6, fontSize: 12, fontWeight: 700, color: cta.ctaColor, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{cta.ctaLabel}</button>
            </div>
          </Hov>
        )
      })}
    </div>
  )
}

function AnalysesTab({ r, repoAnalysisKeys, analyses, actions }) {
  if (repoAnalysisKeys.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--t-faint)', display: 'inline-flex' }}><Icon name="compare" size={34} /></span>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--t-strong)' }}>No analyses yet</span>
        <span style={{ fontSize: 13, color: 'var(--t-muted)', maxWidth: 340, lineHeight: 1.5 }}>Trigger an analysis on an open pull request to detect drift between the code and your specification.</span>
        <button onClick={() => actions.setTab('prs')} style={{ marginTop: 6, padding: '8px 14px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>Go to pull requests</button>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {repoAnalysisKeys.map((k) => {
        const a = analyses[k]
        const num = k.split('#')[1]
        const pr = prs().find((p) => p.repoId === r.id && String(p.number) === num)
        const barColor = a.status === 'completed' ? C.green : (a.status === 'failed' ? C.coralDeep : C.coral)
        const idLabel = a.status === 'completed' ? 'DR-' + num : 'AN-' + num
        const onClick = () => (a.status === 'completed' ? actions.openReport(k) : actions.openAnalysis(k))
        return (
          <Hov key={k} onClick={onClick} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: `4px solid ${barColor}`, padding: '15px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }} hoverStyle={{ background: '#FFFFFF' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-muted)' }}>{idLabel}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-strong)' }}>{pr ? pr.title : k}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-muted)', marginTop: 4 }}>PR #{num} · Respondent {a.respondent} · {a.when}</div>
            </div>
            {a.gaps && a.gaps.length > 0 && <div style={{ display: 'flex', gap: 6, flex: '0 0 auto' }}><GapChip counts={sevCounts(a.gaps)} /></div>}
            <div style={{ flex: '0 0 auto' }}><StatePill status={a.status} /></div>
            <span style={{ color: 'var(--t-faint)', display: 'inline-flex' }}><Icon name="chevron" size={16} /></span>
          </Hov>
        )
      })}
    </div>
  )
}

function RepoSettings({ r }) {
  const meta = [
    { k: 'Repository', v: r.owner + '/' + r.name },
    { k: 'Default branch', v: 'main' },
    { k: 'Language', v: r.lang },
    { k: 'Last synced', v: r.synced },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 640 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', padding: '18px 20px' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>Repository connection</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
          {meta.map((m) => (
            <div key={m.k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderTop: '1px solid var(--hairline)' }}>
              <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>{m.k}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t-strong)', fontWeight: 600 }}>{m.v}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral-deep)', padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t-strong)' }}>Disconnect repository</div>
          <div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 2 }}>Removes this project and all its analyses from Intent Drift.</div>
        </div>
        <Hov as="button" style={{ padding: '8px 14px', border: '1px solid var(--coral)', background: 'var(--paper)', borderRadius: 6, fontSize: 13, fontWeight: 700, color: 'var(--coral-deep)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }} hoverStyle={{ background: 'var(--coral-soft)' }}>Disconnect</Hov>
      </div>
    </div>
  )
}
