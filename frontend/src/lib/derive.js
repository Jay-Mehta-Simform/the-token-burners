// Pure derivation helpers shared across screens (ported from renderVals).
import { C } from './meta.jsx'
import { repos, prs } from '../data/seed.js'

export const prKey = (p) => `${p.repoId}#${p.number}`

// CTA button styling per analysis state (used in PR tables).
export function ctaFor(status) {
  if (status === 'none') return { ctaLabel: 'Analyze', ctaBg: C.coral, ctaColor: '#fff', ctaBorder: C.coral }
  if (status === 'ready') return { ctaLabel: 'Add spec', ctaBg: C.paper, ctaColor: C.coralDeep, ctaBorder: C.coral }
  if (status === 'comparing') return { ctaLabel: 'Comparing…', ctaBg: C.surface, ctaColor: C.muted, ctaBorder: C.hairline }
  if (status === 'questions_ready') return { ctaLabel: 'Answer', ctaBg: C.paper, ctaColor: C.coralDeep, ctaBorder: C.coral }
  if (status === 'completed') return { ctaLabel: 'View', ctaBg: C.paper, ctaColor: C.strong, ctaBorder: C.hairline }
  if (status === 'failed') return { ctaLabel: 'Retry', ctaBg: C.paper, ctaColor: C.coralDeep, ctaBorder: C.coral }
  return { ctaLabel: 'View', ctaBg: C.paper, ctaColor: C.muted, ctaBorder: C.hairline }
}

export function statusOf(analyses, p) {
  const a = analyses[prKey(p)]
  return a ? a.status : 'none'
}

// "Best" (most active) analysis state across a repo's PRs, for the projects list pill.
export function repoLatestState(analyses, repoId) {
  const rp = prs().filter((p) => p.repoId === repoId)
  const order = { analyzing: 0, ready: 1, comparing: 1, questions_ready: 1, failed: 2, completed: 3, none: 4 }
  let best = 'none'
  rp.forEach((p) => {
    const st = statusOf(analyses, p)
    if ((order[st] ?? 4) < (order[best] ?? 4)) best = st
  })
  return best
}

export function findRepo(id) { return repos().find((r) => r.id === id) }
export function findPR(repoId, num) { return prs().find((p) => p.repoId === repoId && String(p.number) === String(num)) }

// Build the Decision Record Markdown (mirrors backend GET /api/analyses/:id/export).
export function buildMarkdown(analyses, key) {
  const a = analyses[key]
  if (!a) return ''
  const [repoId, num] = key.split('#')
  const repo = findRepo(repoId)
  const pr = findPR(repoId, num)
  let md = '# Drift Report — ' + (pr ? pr.title : key) + '\n\n'
  md += '- Repository: ' + (repo ? repo.owner + '/' + repo.name : repoId) + '\n'
  md += '- Pull Request: #' + num + '\n'
  md += '- Respondent: ' + a.respondent + '\n'
  md += '- Status: ' + a.status + '\n\n'
  md += '## Reverse Spec\n\n' + a.reverseSpec + '\n\n'
  md += '## Gaps & Decisions\n\n'
  ;(a.gaps || []).forEach((g, i) => {
    md += (i + 1) + '. **' + g.title + '** (' + g.type.replace(/_/g, ' ') + ', ' + g.severity + ')\n'
    md += '   - ' + g.description + '\n'
    md += '   - Q: ' + g.question + '\n'
    md += '   - A: ' + (g.answer || '(unanswered)') + '\n\n'
  })
  return md
}

export function downloadMarkdown(analyses, key) {
  const md = buildMarkdown(analyses, key)
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = key.replace('#', '-pr') + '-drift-report.md'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
