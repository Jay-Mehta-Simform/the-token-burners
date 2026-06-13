import React, { useState } from 'react'
import Icon from '../lib/Icon.jsx'
import Hov from '../lib/Hov.jsx'
import { StatePill } from '../lib/meta.jsx'
import { repos, prs } from '../data/seed.js'
import { prKey, ctaFor, findRepo } from '../lib/derive.js'

// Global PR Analysis table — all PRs across every project, by analysis state.
export default function PRGlobal({ state, actions }) {
  const [search, setSearch] = useState('')
  const { analyses } = state
  const cols = '2.4fr 1.6fr 1.2fr 1.3fr 0.9fr'
  const Head = ({ children, right }) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-muted)', textAlign: right ? 'right' : 'left' }}>{children}</span>

  const q = search.trim().toLowerCase()
  const rows = prs().filter((p) => {
    if (!q) return true
    const repo = findRepo(p.repoId)
    const repoLabel = repo ? repo.owner + '/' + repo.name : p.repoId
    return p.title.toLowerCase().includes(q) || repoLabel.toLowerCase().includes(q) || String(p.number).includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-faint)', display: 'inline-flex', pointerEvents: 'none' }}><Icon name="search" size={16} /></span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pull requests…"
            style={{ width: 240, height: 36, padding: '0 12px 0 35px', border: '1px solid var(--hairline)', borderRadius: 6, background: 'var(--surface)', fontSize: 13.5, fontFamily: 'var(--font-sans)', color: 'var(--t-strong)', outline: 'none' }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--coral)'; e.target.style.background = 'var(--paper)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--hairline)'; e.target.style.background = 'var(--surface)' }} />
        </div>
      </div>
    <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, padding: '10px 18px', background: 'var(--surface)', borderBottom: '1.5px solid var(--hairline)' }}>
        <Head>Pull Request</Head><Head>Repository</Head><Head>Respondent</Head><Head>Analysis</Head><Head right>Action</Head>
      </div>
      {rows.map((p) => {
        const key = prKey(p)
        const a = analyses[key]
        const status = a ? a.status : 'none'
        const repo = findRepo(p.repoId)
        const cta = ctaFor(status)
        return (
          <Hov key={key} style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', padding: '13px 18px', borderBottom: '1px solid var(--hairline)' }} hoverStyle={{ background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
              <span style={{ color: 'var(--t-muted)', display: 'inline-flex' }}><Icon name="pr" size={16} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-muted)', marginTop: 2 }}>#{p.number} · {p.branch}</div>
              </div>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{repo ? repo.owner + '/' + repo.name : p.repoId}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-muted)' }}>{a ? a.respondent : '—'}</span>
            <div><StatePill status={status} /></div>
            <div style={{ textAlign: 'right' }}>
              <button onClick={() => actions.openAnalysis(key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 11px', border: `1px solid ${cta.ctaBorder}`, background: cta.ctaBg, borderRadius: 6, fontSize: 12, fontWeight: 700, color: cta.ctaColor, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>{cta.ctaLabel}</button>
            </div>
          </Hov>
        )
      })}
    </div>
    </div>
  )
}
