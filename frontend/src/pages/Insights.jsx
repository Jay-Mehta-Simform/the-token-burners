import React from 'react'

export default function Insights() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: 48 }}>🔭</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--coral)' }}>COMING SOON</div>
      <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, color: 'var(--t-strong)', margin: 0 }}>AI Insights</h2>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14.5, color: 'var(--t-muted)', maxWidth: 480, lineHeight: 1.6, margin: 0 }}>
        Deeper AI insights are on the roadmap — including trend analysis, team-level drift patterns, automated remediation suggestions, and predictive gap detection across repositories.
      </p>
    </div>
  )
}
