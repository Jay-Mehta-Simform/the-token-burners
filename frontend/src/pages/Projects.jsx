import React from 'react'
import Icon from '../lib/Icon.jsx'
import Hov from '../lib/Hov.jsx'
import { StatePill } from '../lib/meta.jsx'
import { repos } from '../data/seed.js'
import { repoLatestState } from '../lib/derive.js'

// No-spec indicator (specs are uploaded per-project; none seeded by default).
function NoSpec() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-faint)' }}>
      <span style={{ display: 'inline-flex' }}><Icon name="file" size={13} /></span>
      <span>No spec</span>
    </span>
  )
}

export default function Projects({ state, actions }) {
  const { search, analyses } = state
  const q = search.trim().toLowerCase()
  // BACKEND: replace repos() with data from listProjects(); filter is client-side search.
  const rows = repos().filter((r) => !q || (r.owner + '/' + r.name).toLowerCase().includes(q) || r.desc.toLowerCase().includes(q))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-muted)', letterSpacing: '0.04em', background: 'var(--surface)', border: '1px solid var(--hairline)', padding: '5px 10px', borderRadius: 5, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="github" size={15} /> Synced from GitHub
          </span>
          <span style={{ fontSize: 13, color: 'var(--t-muted)' }}>{rows.length} repositories</span>
        </div>
        {/* BACKEND: resyncProjects() */}
        <Hov as="button" onClick={actions.resync} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 13px', border: '1px solid var(--hairline)', background: 'var(--paper)', borderRadius: 6, fontSize: 13, fontWeight: 600, color: 'var(--t-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }} hoverStyle={{ background: 'var(--surface)' }}>
          <Icon name="refresh" size={15} /> Re-sync repositories
        </Hov>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map((r) => (
          <Hov key={r.id} onClick={() => actions.openProject(r.id)} style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral)', borderRadius: 0, padding: '16px 18px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 18 }} hoverStyle={{ background: '#FFFFFF' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                <span style={{ color: 'var(--t-muted)', display: 'inline-flex', flex: '0 0 auto' }}><Icon name="repo" size={16} /></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, fontWeight: 600, color: 'var(--t-strong)', whiteSpace: 'nowrap' }}>{r.owner}/<span style={{ color: 'var(--coral)' }}>{r.name}</span></span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 4, paddingLeft: 25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.desc}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: '0 0 auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--t-body)' }}><span style={{ width: 9, height: 9, borderRadius: '50%', background: r.langColor, display: 'inline-block' }} />{r.lang}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--t-body)', minWidth: 54 }}><Icon name="pr" size={16} /> {r.openPRs} PRs</div>
              <div style={{ minWidth: 104 }}><NoSpec /></div>
              <div style={{ minWidth: 92 }}><StatePill status={repoLatestState(analyses, r.id)} /></div>
              <span style={{ color: 'var(--t-faint)', display: 'inline-flex' }}><Icon name="chevron" size={16} /></span>
            </div>
          </Hov>
        ))}
      </div>
    </div>
  )
}
