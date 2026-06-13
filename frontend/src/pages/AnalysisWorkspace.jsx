import React from 'react'
import Icon, { Spinner } from '../lib/Icon.jsx'
import Markdown from '../lib/Markdown.jsx'
import { C, StatePill, GapChip, sevCounts, sevMeta, typeMeta } from '../lib/meta.jsx'
import { prs } from '../data/seed.js'
import { prKey, findRepo } from '../lib/derive.js'

export default function AnalysisWorkspace({ state, actions }) {
  const { view, analyses, specDraft } = state
  const key = view.key
  const [repoId, num] = key.split('#')
  const r = findRepo(repoId)
  const pr = prs().find((p) => p.repoId === repoId && String(p.number) === num) || {}
  const a = analyses[key]
  const status = a ? a.status : 'none'

  const editable = status === 'questions_ready'
  const readOnly = status === 'completed'
  const gaps = (a && a.gaps) || []
  const answeredCount = gaps.filter((g) => g.answer && g.answer.trim()).length
  const allAnswered = gaps.length > 0 && answeredCount === gaps.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <button onClick={actions.back} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--t-muted)', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '0.04em' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--coral)')} onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--t-muted)')}>
        <Icon name="back" size={15} /> BACK
      </button>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--t-muted)', display: 'inline-flex' }}><Icon name="pr" /></span>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 700, color: 'var(--t-strong)', letterSpacing: '-0.01em' }}>{pr.title || ('PR #' + num)}</h2>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-muted)', marginTop: 6 }}>{r.owner}/{r.name} · PR #{num} · {pr.branch} · {pr.author}</div>
        </div>
        <div style={{ flex: '0 0 auto' }}><StatePill status={status} /></div>
      </div>

      {a && a.isStale && <StaleBanner onRetrigger={() => actions.triggerAnalysis(key)} />}

      {status === 'none' && <TriggerForm onTrigger={() => actions.triggerAnalysis(key)} />}
      {status === 'analyzing' && <AnalyzingPanel pollId={'a_' + num} />}
      {status === 'comparing' && <ComparingPanel />}
      {status === 'failed' && <FailedPanel message={a.errorMessage} onRetry={() => actions.triggerAnalysis(key)} />}
      {status === 'ready' && (
        <ReadyPanel reverseSpec={a.reverseSpec} specDraft={specDraft} onSpecDraft={actions.setSpecDraft} onCompare={() => actions.provideSpec(key)} />
      )}
      {(status === 'questions_ready' || status === 'completed') && (
        <QuestionsResolved
          a={a} gaps={gaps} editable={editable} readOnly={readOnly}
          answeredCount={answeredCount} allAnswered={allAnswered}
          onAnswer={(gapId, val) => actions.answerQuestion(key, gapId, val)}
          onSubmit={() => actions.submitAnalysis(key)}
          onViewReport={() => actions.openReport(key)}
          onDownload={() => actions.exportAnalysis(key)}
        />
      )}
    </div>
  )
}

function StaleBanner({ onRetrigger }) {
  return (
    <div style={{ background: 'var(--coral-soft)', border: '1px solid var(--coral)', borderLeft: '4px solid var(--coral)', padding: '13px 16px', display: 'flex', alignItems: 'flex-start', gap: 11 }}>
      <span style={{ color: 'var(--coral-deep)', display: 'inline-flex', marginTop: 1 }}><Icon name="alert" size={17} /></span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--coral-deep)' }}>This analysis is stale</div>
        <div style={{ fontSize: 12.5, color: 'var(--t-body)', marginTop: 2 }}>New commits were pushed to this PR after the analysis ran. Re-trigger to analyze the latest code — re-triggering resets all answers.</div>
      </div>
      <button onClick={onRetrigger} style={{ flex: '0 0 auto', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
        <Icon name="refresh" size={15} /> Re-trigger
      </button>
    </div>
  )
}

function TriggerForm({ onTrigger }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', padding: '22px 24px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--coral)' }}>TRIGGER ANALYSIS</div>
      <h3 style={{ margin: '8px 0 4px', fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 700, color: 'var(--t-strong)' }}>Analyze this pull request.</h3>
      <p style={{ fontSize: 13.5, color: 'var(--t-muted)', margin: '0 0 18px', lineHeight: 1.55, maxWidth: 600 }}>Intent Drift fetches the changed files, reverse-engineers what the code actually does, and shows you the result. You can optionally add your original specification afterwards to detect gaps and generate targeted questions.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 16px', background: 'var(--paper)', border: '1px solid var(--hairline)' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--coral)', marginTop: 1, flex: '0 0 auto' }}>01</span>
          <div><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-strong)' }}>Reverse spec generation</div><div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 2 }}>Infer what the code does from the changed files alone.</div></div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 16px', background: 'var(--paper)', border: '1px solid var(--hairline)', opacity: 0.5 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, color: 'var(--t-faint)', marginTop: 1, flex: '0 0 auto' }}>02</span>
          <div><div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--t-muted)' }}>Gap analysis + questions</div><div style={{ fontSize: 12.5, color: 'var(--t-faint)', marginTop: 2 }}>Runs after you provide your original specification. Optional.</div></div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* BACKEND: triggerAnalysis({ projectId, prNumber }) — locks PR, caller becomes Respondent. */}
        <button onClick={onTrigger} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
          <Icon name="sparkles" /> Analyze PR
        </button>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint)' }}>Changed files fetched at trigger time · you become the Respondent · first-trigger-wins</span>
      </div>
    </div>
  )
}

function PipelineRow({ num, label, stt }) {
  const numColor = stt === 'pending' ? C.faint : C.coral
  const iconColor = stt === 'done' ? C.green : (stt === 'active' ? C.coral : '#6F6F6F')
  const textColor = stt === 'pending' ? '#8A8A8A' : '#D7D7D4'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: numColor, width: 24 }}>{num}</span>
      <span style={{ display: 'inline-flex', width: 18, color: iconColor }}>
        {stt === 'done' ? <Icon name="check" size={15} /> : stt === 'active' ? <Spinner size={14} /> : <Icon name="clock" size={14} />}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: textColor }}>{label}</span>
    </div>
  )
}

function AnalyzingPanel({ pollId }) {
  return (
    <div style={{ background: 'var(--code-bg)', borderRadius: 14, padding: '30px 32px', color: 'var(--code-text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-flex', color: 'var(--coral)' }}><Spinner size={18} /></span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#fff', letterSpacing: '0.04em' }}>ANALYZING PULL REQUEST…</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        <PipelineRow num="01" label="Reverse spec generation" stt="done" />
        <PipelineRow num="02" label="Gap analysis" stt="active" />
        <PipelineRow num="03" label="Question generation" stt="pending" />
      </div>
      {/* BACKEND: frontend polls getAnalysis(pollId) until status leaves "analyzing". */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--code-comment)', marginTop: 24 }}>{`// frontend polls /api/analyses/${pollId} for status`}</div>
    </div>
  )
}

function ComparingPanel() {
  return (
    <div style={{ background: 'var(--code-bg)', borderRadius: 14, padding: '30px 32px', color: 'var(--code-text)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ display: 'inline-flex', color: 'var(--coral)' }}><Spinner size={18} /></span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: '#fff', letterSpacing: '0.04em' }}>COMPARING AGAINST SPECIFICATION…</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
        <PipelineRow num="02" label="Gap analysis" stt="active" />
        <PipelineRow num="03" label="Question generation" stt="pending" />
      </div>
    </div>
  )
}

function FailedPanel({ message, onRetry }) {
  return (
    <div style={{ background: 'var(--coral-soft)', border: '1px solid var(--coral)', padding: '26px 28px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--coral-deep)', display: 'inline-flex' }}><Icon name="alert" size={17} /></span>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--coral-deep)' }}>Analysis failed</span>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--t-body)', margin: 0, lineHeight: 1.55, maxWidth: 560 }}>{message}</p>
      <button onClick={onRetry} style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 13.5, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
        <Icon name="refresh" size={15} /> Retry analysis
      </button>
    </div>
  )
}

function ReverseSpecPanel({ reverseSpec, label = 'REVERSE SPEC · WHAT THE CODE ACTUALLY DOES' }) {
  return (
    <div style={{ background: 'var(--code-bg)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'var(--code-fn)', display: 'inline-flex' }}><Icon name="terminal" size={15} /></span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-muted-d)' }}>{label}</span>
      </div>
      {/* Reverse spec is AI-generated Markdown — see SPEC.md. */}
      <div style={{ padding: '18px 20px' }}><Markdown className="md-reverse-spec">{reverseSpec}</Markdown></div>
    </div>
  )
}

function OriginalSpecPanel({ spec }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 18px', borderBottom: '1px solid var(--hairline)' }}>
        <span style={{ color: 'var(--coral)', display: 'inline-flex' }}><Icon name="compare" size={15} /></span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t-muted)' }}>ORIGINAL SPEC · WHAT WAS INTENDED</span>
      </div>
      <div style={{ padding: '18px 20px' }}><Markdown className="md-original-spec">{spec}</Markdown></div>
    </div>
  )
}

function SpecComparison({ reverseSpec, spec }) {
  if (!spec) return <ReverseSpecPanel reverseSpec={reverseSpec} />
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}>
      <OriginalSpecPanel spec={spec} />
      <ReverseSpecPanel reverseSpec={reverseSpec} />
    </div>
  )
}

function ReadyPanel({ reverseSpec, specDraft, onSpecDraft, onCompare }) {
  const handleUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onSpecDraft(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <ReverseSpecPanel reverseSpec={reverseSpec} />
      <div style={{ background: 'var(--surface)', border: '1px solid var(--hairline)', borderLeft: '4px solid var(--coral)', padding: '20px 22px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--coral)' }}>ADD YOUR SPECIFICATION — OPTIONAL</div>
        <p style={{ fontSize: 13.5, color: 'var(--t-muted)', margin: '8px 0 14px', lineHeight: 1.55, maxWidth: 600 }}>Paste your original specification below. Intent Drift will compare it against the reverse spec above, identify gaps, and generate targeted questions for you to answer.</p>
        <textarea value={specDraft} onChange={(e) => onSpecDraft(e.target.value)} placeholder="Paste your original specification here…"
          style={{ width: '100%', minHeight: 140, resize: 'vertical', padding: '13px 15px', border: '1px solid var(--hairline)', borderRadius: 6, background: 'var(--paper)', fontFamily: 'var(--font-mono)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--t-body)', outline: 'none' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--coral)')} onBlur={(e) => (e.target.style.borderColor = 'var(--hairline)')} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 6, fontSize: 14, fontWeight: 700, color: 'var(--t-body)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--coral)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}>
            <Icon name="upload" size={15} /> Upload Specs
            <input type="file" accept=".md,.txt,.pdf" style={{ display: 'none' }} onChange={handleUpload} />
          </label>
          {/* BACKEND: provideSpec(analysisId, specDraft) -> gap analysis + question gen. */}
          <button onClick={onCompare} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
            <Icon name="compare" /> Compare against spec
          </button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--t-faint)' }}>Generates gaps &amp; questions for you to answer</span>
        </div>
      </div>
    </div>
  )
}

function GapCard({ g, editable, readOnly, onAnswer }) {
  const tm = typeMeta(g.type)
  const sm = sevMeta(g.severity)
  return (
    <div style={{ background: 'var(--paper)', border: '1px solid var(--hairline)', borderLeft: `4px solid ${sm.bar}` }}>
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
        {editable && (
          /* BACKEND: saveAnswer(analysisId, g.id, value) on change (debounced). */
          <textarea value={g.answer} onChange={(e) => onAnswer(g.id, e.target.value)} placeholder="Your answer…"
            style={{ width: '100%', minHeight: 64, resize: 'vertical', marginTop: 11, padding: '11px 13px', border: '1px solid var(--hairline)', borderRadius: 6, background: 'var(--paper)', fontFamily: 'var(--font-sans)', fontSize: 13, lineHeight: 1.55, color: 'var(--t-body)', outline: 'none' }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--coral)')} onBlur={(e) => (e.target.style.borderColor = 'var(--hairline)')} />
        )}
        {readOnly && (
          <div style={{ marginTop: 11, background: 'var(--paper)', border: '1px solid var(--hairline)', borderLeft: '3px solid var(--green)', padding: '11px 13px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--green)', textTransform: 'uppercase', marginBottom: 5 }}>ANSWERED</div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--t-body)' }}>{g.answer}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionsResolved({ a, gaps, editable, readOnly, answeredCount, allAnswered, onAnswer, onSubmit, onViewReport, onDownload }) {
  const submitStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', border: 'none', borderRadius: 6,
    fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-sans)', cursor: allAnswered ? 'pointer' : 'not-allowed',
    background: allAnswered ? C.coral : '#E6C9CE', color: '#fff', opacity: allAnswered ? 1 : 0.85,
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <SpecComparison reverseSpec={a.reverseSpec} spec={a.spec} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 700, color: 'var(--t-strong)' }}>{gaps.length} gaps detected</span>
          <div style={{ display: 'flex', gap: 6 }}><GapChip counts={sevCounts(gaps)} /></div>
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--t-muted)' }}>{answeredCount} of {gaps.length} answered</span>
      </div>

      {gaps.map((g) => <GapCard key={g.id} g={g} editable={editable} readOnly={readOnly} onAnswer={onAnswer} />)}

      {editable && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', paddingTop: 4 }}>
          {/* BACKEND: submitAnalysis(analysisId) — server gates on all-answered. */}
          <button onClick={onSubmit} disabled={!allAnswered} style={submitStyle}><Icon name="check" size={14} /> Submit decision record</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--t-muted)' }}>{allAnswered ? 'All questions answered — ready to submit.' : 'Answer every question to enable submit.'}</span>
        </div>
      )}
      {readOnly && (
        <div style={{ background: 'var(--green-soft)', border: '1px solid var(--green)', borderLeft: '4px solid var(--green)', padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--green)', display: 'inline-flex' }}><Icon name="check" size={22} /></span>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t-strong)' }}>Decision record complete</div>
            <div style={{ fontSize: 12.5, color: 'var(--t-muted)', marginTop: 2 }}>Submitted by {a.respondent} · {a.when} · visible to all repo members</div>
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={onViewReport} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'var(--paper)', border: '1px solid var(--hairline)', borderRadius: 6, fontSize: 13, fontWeight: 700, color: 'var(--t-strong)', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--coral)')} onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--hairline)')}>
              <Icon name="compare" /> Open report
            </button>
            {/* BACKEND: window.location = exportUrl(analysisId) to stream the .md from the server. */}
            <button onClick={onDownload} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'var(--coral)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--coral-deep)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--coral)')}>
              <Icon name="download" size={15} /> Markdown
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
