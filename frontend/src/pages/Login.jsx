import React from 'react'
import Icon from '../lib/Icon.jsx'

// Login gate — charcoal full-bleed screen. GitHub OAuth is the only login method.
export default function Login({ onLogin }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 34, left: 40, display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--coral)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="compare" size={17} color="#fff" />
        </span>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>Intent Drift</span>
      </div>
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--coral)' }}>AI GOVERNANCE FOR PULL REQUESTS</div>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 38, lineHeight: 1.1, letterSpacing: '-0.02em', color: '#fff', margin: '16px 0 0' }}>
          Catch when code <span style={{ color: 'var(--coral)' }}>drifts</span> from its spec.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.55, color: 'var(--t-body-d)', margin: '16px 0 28px', maxWidth: 460 }}>
          Link a repository, point Intent Drift at a pull request, and it reverse-engineers what the code does, finds the gaps against your specification, and turns them into questions your team actually answers.
        </p>
        {/* BACKEND: this should call beginGithubOAuth() to hit /auth/github. */}
        <button onClick={onLogin} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--coral)', color: '#fff', border: 'none', borderRadius: 7, padding: '13px 20px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
          <Icon name="github" size={20} /> Continue with GitHub
        </button>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint-d)', marginTop: 18, letterSpacing: '0.04em' }}>GitHub OAuth is the only login method. Tokens are encrypted at rest.</div>
      </div>
    </div>
  )
}
