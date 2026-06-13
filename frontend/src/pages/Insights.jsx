import React from 'react'
import { C, typeMeta, sevMeta } from '../lib/meta.jsx'
import { repos } from '../data/seed.js'

// AI Insights — cross-project drift intelligence aggregated from analyses.
export default function Insights({ state }) {
  const { analyses } = state
  const A = analyses

  const allGaps = []
  Object.keys(A).forEach((k) => {
    if (A[k].status === 'ready' || A[k].status === 'completed') {
      ;(A[k].gaps || []).forEach((g) => allGaps.push({ ...g, repoId: k.split('#')[0] }))
    }
  })
  const typeCount = { missing_feature: 0, deviation: 0, undocumented_addition: 0 }
  const sevCount = { high: 0, medium: 0, low: 0 }
  allGaps.forEach((g) => { typeCount[g.type]++; sevCount[g.severity]++ })
  const totalGaps = allGaps.length || 1

  const gapsByType = ['missing_feature', 'deviation', 'undocumented_addition'].map((t) => {
    const tm = typeMeta(t)
    return { label: tm.label, mark: tm.mark, color: tm.color, count: typeCount[t], pct: Math.round(typeCount[t] / totalGaps * 100) + '%' }
  })
  const gapsBySeverity = ['high', 'medium', 'low'].map((s) => {
    const sm = sevMeta(s)
    return { label: sm.label, color: s === 'high' ? C.coral : (s === 'medium' ? C.coralDeep : C.muted), count: sevCount[s], pct: Math.round(sevCount[s] / totalGaps * 100) + '%' }
  })

  const driftByRepo = {}
  allGaps.forEach((g) => { driftByRepo[g.repoId] = (driftByRepo[g.repoId] || 0) + 1 })
  const topDrift = Object.keys(driftByRepo).map((id) => { const r = repos().find((x) => x.id === id); return { name: r ? r.owner + '/' + r.name : id, gaps: driftByRepo[id] } }).sort((a, b) => b.gaps - a.gaps).slice(0, 5)

  const analyzedCount = Object.keys(A).length
  const completedCount = Object.keys(A).filter((k) => A[k].status === 'completed').length
  const insightStats = [
    { value: String(analyzedCount), label: 'PRS ANALYZED' },
    { value: String(allGaps.length), label: 'GAPS FOUND' },
    { value: String(completedCount), label: 'DECISION RECORDS' },
    { value: String(repos().length), label: 'CONNECTED REPOS' },
  ]
  const insightHeadline = `Across ${analyzedCount} analyzed pull requests, the most common drift is ${typeCount.deviation >= typeCount.missing_feature ? 'specification deviation — code that quietly relaxes a defined constraint' : 'missing features the spec requires'}. ${sevCount.high} high-severity gaps are open and should block merge until the Respondent answers them.`

  const Bar = ({ label, mark, color, count, pct, upper }) => (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 11.5, fontWeight: 700, color, textTransform: upper ? 'uppercase' : 'none', letterSpacing: upper ? '0.06em' : 0 }}>{mark ? mark + ' ' : ''}{label}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--t-strong)' }}>{count}</span>
      </div>
      <div style={{ height: 7, background: 'var(--surface)', overflow: 'hidden' }}><div style={{ height: '100%', width: pct, background: color }} /></div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--ink)', borderRadius: 14, padding: '24px 26px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--coral)' }}>CROSS-PROJECT DRIFT INTELLIGENCE</div>
        <p style={{ margin: '12px 0 0', fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 500, lineHeight: 1.5, color: '#fff', maxWidth: 760 }}>{insightHeadline}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 30, marginTop: 20 }}>
          {insightStats.map((s) => (
            <div key={s.label}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-muted-d)', marginTop: 3, letterSpacing: '0.04em' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: '1 1 300px', minWidth: 0, background: 'var(--paper)', border: '1px solid var(--hairline)', padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>Gaps by type</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {gapsByType.map((t) => <Bar key={t.label} {...t} />)}
          </div>
        </div>
        <div style={{ flex: '1 1 300px', minWidth: 0, background: 'var(--paper)', border: '1px solid var(--hairline)', padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>Gaps by severity</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
            {gapsBySeverity.map((t) => <Bar key={t.label} {...t} upper />)}
          </div>
        </div>
        <div style={{ flex: '1 1 240px', minWidth: 0, background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral)', padding: '18px 20px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--coral)' }}>MOST DRIFT</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 14 }}>
            {topDrift.map((d) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--t-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, fontWeight: 700, color: 'var(--coral)', flex: '0 0 auto' }}>{d.gaps} gaps</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
