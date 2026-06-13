import React from 'react'
import Icon from '../lib/Icon.jsx'
import Markdown from '../lib/Markdown.jsx'
import { GapChip, sevCounts, sevMeta, typeMeta } from '../lib/meta.jsx'
import { prs } from '../data/seed.js'
import { findRepo, downloadMarkdown } from '../lib/derive.js'

// Drift Report (Decision Record) detail — read-only view of a completed analysis.
export default function ReportDetail({ state, actions }) {
  const { view, analyses } = state
  const key = view.key
  const [repoId, num] = key.split('#')
  const r = findRepo(repoId)
  const pr = prs().find((p) => p.repoId === repoId && String(p.number) === num) || {}
  const a = analyses[key] || { gaps: [] }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 900 }}>
      <button onClick={actions.back} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--t-muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--coral)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-muted)')}>
        <Icon name="back" size={15} /> BACK
      </button>

      <div style={{ borderBottom: '1.5px solid var(--hairline)', paddingBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--coral)' }}>DRIFT REPORT · DR-{num}</div>
            <h2 style={{ margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, color: 'var(--t-strong)', letterSpacing: '-0.015em' }}>{pr.title || key}</h2>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-muted)', marginTop: 7 }}>{r.owner}/{r.name} · PR #{num} · Respondent {a.respondent} · {a.when}</div>
          </div>
          {/* BACKEND: window.location = exportUrl(analysisId) */}
          <button onClick={() => downloadMarkdown(analyses, key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 15px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
            <Icon name="download" size={15} /> Download Markdown
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}><GapChip counts={sevCounts(a.gaps)} /></div>
      </div>

      {a.isStale && (
        <div style={{ background: 'var(--coral-soft)', border: '1px solid var(--coral)', borderLeft: '4px solid var(--coral)', padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
          <span style={{ color: 'var(--coral-deep)', display: 'inline-flex', marginTop: 1 }}><Icon name="alert" size={17} /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral-deep)' }}>This decision record is stale</div>
            <div style={{ fontSize: 12.5, color: 'var(--t-body)', marginTop: 2 }}>New commits were pushed after this analysis ran. The decisions below reflect the earlier code. Re-trigger to analyze the latest commit — re-triggering resets all answers.</div>
          </div>
          <button onClick={() => { actions.triggerAnalysis(key); actions.openAnalysis(key) }} style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
            <Icon name="refresh" size={15} /> Re-trigger
          </button>
        </div>
      )}

      <div style={{ background: 'var(--code-bg)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <span style={{ color: 'var(--code-fn)', display: 'inline-flex' }}><Icon name="terminal" size={15} /></span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-muted-d)' }}>REVERSE SPEC</span>
        </div>
        <div style={{ padding: '18px 20px' }}><Markdown className="md-reverse-spec">{a.reverseSpec}</Markdown></div>
      </div>

      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--t-strong)' }}>Gaps &amp; decisions</div>
      {(a.gaps || []).map((g) => {
        const tm = typeMeta(g.type)
        const sm = sevMeta(g.severity)
        return (
          <div key={g.id} style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', borderLeft: `4px solid ${sm.bar}` }}>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', color: tm.color }}>{tm.mark} {tm.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 8px', borderRadius: 3, background: sm.bg, color: sm.color }}>{sm.label}</span>
              </div>
              <h4 style={{ margin: '10px 0 5px', fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 700, color: 'var(--t-strong)' }}>{g.title}</h4>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: 'var(--t-muted)' }}>{g.description}</p>
            </div>
            <div style={{ background: 'var(--surface)', borderTop: '1px solid var(--hairline)', padding: '15px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                <span style={{ color: 'var(--coral)', display: 'inline-flex', marginTop: 1 }}><Icon name="message" size={15} /></span>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t-strong)', lineHeight: 1.45 }}>{g.question}</div>
              </div>
              <div style={{ marginTop: 11, background: 'var(--paper)', border: '1px solid var(--hairline)', borderLeft: '3px solid var(--green)', padding: '11px 13px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 5 }}>DECISION</div>
                <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--t-body)' }}>{g.answer}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
