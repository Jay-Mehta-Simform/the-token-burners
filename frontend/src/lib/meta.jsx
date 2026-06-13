// Semantic palette + status/severity/type metadata + shared status chips.
// Ported verbatim from the design prototype's C / sevMeta / typeMeta / statePill / gapChip.
import React from 'react'
import Icon, { Spinner } from './Icon.jsx'

export const C = {
  coral: '#EF5366', coralDeep: '#E0313B', coralSoft: '#F7ECEE',
  green: '#6AA84F', greenSoft: '#E8F1E3',
  ink: '#3D3D3D', surface: '#F6F6F4', hairline: '#DBDBD8', paper: '#FFFFFF',
  strong: '#3D3D3D', body: '#4A4A4A', muted: '#6E6E6E', faint: '#9A9A98',
}

export function sevMeta(s) {
  return ({
    high: { label: 'HIGH', bg: C.coral, color: '#fff', bar: C.coral },
    medium: { label: 'MEDIUM', bg: C.coralSoft, color: C.coralDeep, bar: C.coral },
    low: { label: 'LOW', bg: C.surface, color: C.muted, bar: '#CFCFCB' },
  })[s] || { label: 'LOW', bg: C.surface, color: C.muted, bar: '#CFCFCB' }
}

export function typeMeta(t) {
  return ({
    missing_feature: { label: 'MISSING FEATURE', mark: '✕', color: C.coralDeep },
    deviation: { label: 'DEVIATION', mark: '→', color: C.coral },
    undocumented_addition: { label: 'UNDOCUMENTED ADDITION', mark: '+', color: C.green },
  })[t] || { label: 'GAP', mark: '•', color: C.muted }
}

export function sevCounts(gaps) {
  const c = { high: 0, medium: 0, low: 0 }
  ;(gaps || []).forEach((g) => { c[g.severity] = (c[g.severity] || 0) + 1 })
  return c
}

// Status pill — analysis lifecycle: none → analyzing → ready → comparing →
// questions_ready → completed | failed.
export function StatePill({ status }) {
  const map = {
    none: { txt: 'NOT ANALYZED', color: C.muted, bg: C.surface, border: C.hairline, icon: null, spin: false },
    analyzing: { txt: 'ANALYZING', color: C.coral, bg: C.coralSoft, border: C.coral, icon: null, spin: true },
    ready: { txt: 'REVERSE SPEC READY', color: C.coralDeep, bg: C.coralSoft, border: C.coral, icon: 'file', spin: false },
    comparing: { txt: 'COMPARING', color: C.coral, bg: C.coralSoft, border: C.coral, icon: null, spin: true },
    questions_ready: { txt: 'QUESTIONS READY', color: C.coralDeep, bg: C.coralSoft, border: C.coral, icon: 'message', spin: false },
    completed: { txt: 'COMPLETED', color: '#fff', bg: C.green, border: C.green, icon: 'check', spin: false },
    failed: { txt: 'FAILED', color: '#fff', bg: C.coralDeep, border: C.coralDeep, icon: 'x', spin: false },
  }
  const m = map[status] || map.none
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-mono)',
      fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.06em', padding: '4px 9px',
      borderRadius: '3px', background: m.bg, color: m.color,
      border: m.border ? `1px solid ${m.border}` : 'none', whiteSpace: 'nowrap',
    }}>
      {m.spin && <span style={{ display: 'inline-flex', color: m.color }}><Spinner size={12} /></span>}
      {!m.spin && m.icon && <span style={{ display: 'inline-flex', color: m.color }}><Icon name={m.icon} size={12} /></span>}
      <span>{m.txt}</span>
    </span>
  )
}

// Severity count chips (e.g. "2 high · 1 medium").
export function GapChip({ counts }) {
  const out = []
  ;[['high', C.coral], ['medium', C.coralSoft], ['low', C.surface]].forEach(([k, bg]) => {
    const n = counts[k] || 0
    if (!n) return
    const dark = k === 'high'
    out.push(
      <span key={k} style={{
        fontFamily: 'var(--font-mono)', fontSize: '10px', fontWeight: 700, padding: '2px 7px',
        borderRadius: '3px', background: bg,
        color: dark ? '#fff' : (k === 'medium' ? C.coralDeep : C.muted),
        border: k === 'low' ? `1px solid ${C.hairline}` : 'none',
      }}>{n + ' ' + k}</span>
    )
  })
  return <span style={{ display: 'inline-flex', gap: 6 }}>{out}</span>
}
