import React from 'react'
import Icon from '../lib/Icon.jsx'
import { findRepo, findPR } from '../lib/derive.js'

const TITLES = {
  projects: ['Projects', 'Repositories synced from your GitHub account'],
  pr: ['PR Analysis', 'Pull requests across all projects, by analysis state'],
  reports: ['Drift Reports', 'Completed decision records, viewable by all repo members'],
  insights: ['AI Insights', 'Cross-project drift intelligence'],
  settings: ['Settings', 'Account & GitHub connection'],
}

function headerInfo(state) {
  const { view, page } = state
  if (!view) {
    const [t, s] = TITLES[page] || ['', '']
    return { pageTitle: t, pageSub: s, crumbRoot: '', showBreadcrumb: false }
  }
  if (view.type === 'project') {
    const r = findRepo(view.id) || {}
    return { pageTitle: r.name, pageSub: 'acme/' + r.name, crumbRoot: 'Projects', showBreadcrumb: true }
  }
  if (view.type === 'analysis') {
    const [repoId, num] = view.key.split('#')
    const r = findRepo(repoId) || {}
    return { pageTitle: 'PR #' + num, pageSub: r.owner + '/' + r.name, crumbRoot: r.name, showBreadcrumb: true }
  }
  if (view.type === 'report') {
    const [repoId, num] = view.key.split('#')
    const r = findRepo(repoId) || {}
    return { pageTitle: 'Drift Report', pageSub: 'DR-' + num, crumbRoot: r.name, showBreadcrumb: true }
  }
  return { pageTitle: '', pageSub: '', crumbRoot: '', showBreadcrumb: false }
}

export default function Header({ state, actions }) {
  const { pageTitle, pageSub, crumbRoot, showBreadcrumb } = headerInfo(state)

  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--paper)', borderBottom: '1.5px solid var(--hairline)', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', height: 62 }}>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {showBreadcrumb && (
            <span onClick={actions.back} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-faint)', cursor: 'pointer', letterSpacing: '0.02em' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--coral)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-faint)')}>{crumbRoot} /</span>
          )}
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em', margin: 0, color: 'var(--t-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageTitle}</h1>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pageSub}</span>
      </div>
      <div style={{ flex: 1 }} />
      <div style={{ position: 'relative', width: 280, maxWidth: '30vw' }}>
        <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-faint)', display: 'inline-flex', pointerEvents: 'none' }}><Icon name="search" size={16} /></span>
        <input value={state.search} onChange={(e) => actions.setSearch(e.target.value)} placeholder="Search repositories…"
          style={{ width: '100%', height: 38, padding: '0 12px 0 35px', border: '1px solid var(--hairline)', borderRadius: 6, background: 'var(--surface)', fontSize: 13.5, fontFamily: 'var(--font-sans)', color: 'var(--t-strong)', outline: 'none' }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--coral)'; e.target.style.background = 'var(--paper)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--hairline)'; e.target.style.background = 'var(--surface)' }} />
      </div>
      <button style={{ position: 'relative', width: 38, height: 38, border: '1px solid var(--hairline)', borderRadius: 6, background: 'var(--paper)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t-muted)', cursor: 'pointer', flex: '0 0 auto' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--paper)')}>
        <Icon name="bell" size={18} />
        <span style={{ position: 'absolute', top: 8, right: 9, width: 6, height: 6, borderRadius: '50%', background: 'var(--coral)' }} />
      </button>
    </header>
  )
}
