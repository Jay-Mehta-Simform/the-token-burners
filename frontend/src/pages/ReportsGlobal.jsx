import React from 'react'
import Icon from '../lib/Icon.jsx'
import Hov from '../lib/Hov.jsx'
import { GapChip, sevCounts } from '../lib/meta.jsx'
import { findRepo, findPR } from '../lib/derive.js'

// Drift Reports — every completed Decision Record, viewable by all repo members.
export default function ReportsGlobal({ state, actions }) {
  const { analyses } = state
  const completedKeys = Object.keys(analyses).filter((k) => analyses[k].status === 'completed')

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
      {completedKeys.map((key) => {
        const a = analyses[key]
        const [repoId, num] = key.split('#')
        const repo = findRepo(repoId)
        const pr = findPR(repoId, num)
        return (
          <Hov key={key} onClick={() => actions.openReport(key)} style={{ flex: '1 1 380px', minWidth: 320, background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral)', padding: '18px 20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 12 }} hoverStyle={{ background: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-muted)' }}>DR-{num}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {a.isStale && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', padding: '3px 8px', borderRadius: 3, background: 'var(--coral-soft)', color: 'var(--coral-deep)', border: '1px solid var(--coral)' }}>STALE</span>}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 3, background: 'var(--green)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} /> COMPLETED</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t-muted)' }}>{repo ? repo.owner + '/' + repo.name : repoId}</div>
              <h3 style={{ margin: '4px 0 0', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--t-strong)', letterSpacing: '-0.01em' }}>{pr ? pr.title : key}</h3>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><GapChip counts={sevCounts(a.gaps)} /></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--hairline)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint)' }}>{a.respondent} · {a.when}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color: 'var(--coral)' }}>OPEN →</span>
            </div>
          </Hov>
        )
      })}
    </div>
  )
}
