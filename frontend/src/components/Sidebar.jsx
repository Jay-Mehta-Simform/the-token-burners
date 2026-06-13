import React from 'react'
import Icon from '../lib/Icon.jsx'
import Hov from '../lib/Hov.jsx'
import { C } from '../lib/meta.jsx'
import { repos } from '../data/seed.js'
import { CURRENT_USER } from '../data/seed.js'

// Charcoal left navigation. Active item gets a coral left bar + raised bg.
export default function Sidebar({ state, actions }) {
  const { page, view, analyses } = state
  const repoCount = repos().length
  const reportCount = Object.keys(analyses).filter((k) => analyses[k].status === 'completed').length

  const isActive = (id) =>
    (page === id && !view) ||
    (id === 'projects' && view && view.type === 'project') ||
    (id === 'pr' && view && view.type === 'analysis') ||
    (id === 'reports' && view && view.type === 'report')

  const navStyle = (id) => ({
    display: 'flex', alignItems: 'center', gap: 11, padding: '9px 11px', borderRadius: 6, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: 14, whiteSpace: 'nowrap',
    fontWeight: isActive(id) ? 600 : 500,
    color: isActive(id) ? '#fff' : '#C6C6C6',
    background: isActive(id) ? '#2A2A2A' : 'transparent',
    borderLeft: isActive(id) ? `3px solid ${C.coral}` : '3px solid transparent',
  })
  const navHover = { background: 'rgba(255,255,255,0.05)', color: '#fff' }

  const item = (id, icon, label, trailing) => (
    <Hov style={navStyle(id)} hoverStyle={isActive(id) ? {} : navHover} onClick={() => actions.go(id)}>
      <span style={{ display: 'inline-flex', width: 18 }}><Icon name={icon} /></span>
      <span>{label}</span>
      {trailing}
    </Hov>
  )

  return (
    <aside style={{ width: 236, flex: '0 0 236px', background: 'var(--ink)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', zIndex: 30 }}>
      <div onClick={() => actions.go('projects')} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '20px 20px 16px', cursor: 'pointer' }}>
        <span style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--coral)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
          <Icon name="compare" size={17} color="#fff" />
        </span>
        <span style={{ fontSize: 15.5, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Intent Drift</span>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 400, color: 'var(--t-faint-d)', letterSpacing: '0.16em', padding: '10px 8px 7px' }}>WORKSPACE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {item('projects', 'repo', 'Projects', <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint-d)' }}>{repoCount}</span>)}
          {item('pr', 'pr', 'PR Analysis')}
          {item('reports', 'compare', 'Drift Reports', <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fff', background: 'var(--coral)', borderRadius: 3, padding: '0 6px' }}>{reportCount}</span>)}
          {item('insights', 'sparkles', 'AI Insights')}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 400, color: 'var(--t-faint-d)', letterSpacing: '0.16em', padding: '18px 8px 7px' }}>ACCOUNT</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {item('settings', 'settings', 'Settings')}
        </div>
      </nav>

      <div style={{ padding: 12, borderTop: '1px solid var(--hairline-ink)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8 }}>
          <span style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--ink-card)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
            <Icon name="github" size={15} />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{CURRENT_USER}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--t-faint-d)' }}>CONNECTED</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
