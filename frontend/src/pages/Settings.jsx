import React from 'react'
import Icon from '../lib/Icon.jsx'
import Hov from '../lib/Hov.jsx'
import { repos, CURRENT_USER } from '../data/seed.js'

// Account settings — GitHub connection + AI pipeline summary + sign out.
export default function Settings({ actions }) {
  const repoCount = repos().length
  const pipelineInfo = [
    { num: '01', label: 'Reverse spec generation', desc: 'Infer what the code does from the changed files alone.' },
    { num: '02', label: 'Gap analysis', desc: 'Compare the reverse spec against your specification.' },
    { num: '03', label: 'Question generation', desc: 'Turn each gap into a specific, answerable question.' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
      <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', padding: '20px 22px' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>GitHub connection</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <span style={{ width: 46, height: 46, borderRadius: 8, background: 'var(--ink)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="github" size={20} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--t-strong)' }}>{CURRENT_USER}</div>
            <div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 2 }}>OAuth connected · {repoCount} repositories accessible</div>
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', gap: 5 }}><Icon name="check" size={14} /> ACTIVE</span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint)', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>OAuth token encrypted at rest. Intent Drift never exposes it to the frontend.</div>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', padding: '20px 22px' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>AI pipeline</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 10 }}>
          {pipelineInfo.map((row) => (
            <div key={row.num} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: '1px solid var(--hairline)' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--coral)', width: 24 }}>{row.num}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-strong)' }}>{row.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 1 }}>{row.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint)', marginTop: 12 }}>All three calls run server-side on Anthropic Claude. The key is never exposed to the browser.</div>
      </div>

      <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral-deep)', padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--t-strong)' }}>Sign out</div>
          <div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 2 }}>End your session on this device.</div>
        </div>
        {/* BACKEND: logout() then redirect to login. */}
        <Hov as="button" onClick={actions.logout} style={{ padding: '8px 14px', border: '1px solid var(--coral)', background: 'var(--paper)', borderRadius: 6, fontSize: 13, fontWeight: 700, color: 'var(--coral-deep)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }} hoverStyle={{ background: 'var(--coral-soft)' }}>Sign out</Hov>
      </div>
    </div>
  )
}
