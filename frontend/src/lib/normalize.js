// Maps backend API payloads onto the camelCase shapes the UI components read,
// and derives presentation-only fields the backend doesn't provide
// (language colour, relative "synced" time). See specs/BACKEND_PLAN.md Part B.

const LANG_COLORS = {
  TypeScript: '#3178C6',
  JavaScript: '#F1E05A',
  Go: '#00ADD8',
  Python: '#3572A5',
  Java: '#B07219',
  Swift: '#F05138',
  Ruby: '#701516',
  Rust: '#DEA584',
  'C++': '#F34B7D',
  C: '#555555',
  'C#': '#178600',
  PHP: '#4F5D95',
  Kotlin: '#A97BFF',
  Shell: '#89E051',
  HTML: '#E34C26',
  CSS: '#563D7C',
  Vue: '#41B883',
  Dart: '#00B4AB',
  Scala: '#C22D40',
  Node: '#539E43',
}

export function langColor(lang) {
  return LANG_COLORS[lang] || '#9A9A98'
}

// ISO timestamp -> "just now" / "12m ago" / "3h ago" / "2d ago" / date.
export function relTime(value) {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return String(value)
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (secs < 45) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  if (days < 30) return days + 'd ago'
  return new Date(value).toLocaleDateString()
}

// GET /api/projects row -> repo shape consumed by Projects/ProjectDetail/etc.
export function normalizeProject(p) {
  return {
    id: p.id,
    owner: p.owner || '',
    name: p.name,
    lang: p.lang || '—',
    langColor: langColor(p.lang),
    openPRs: 0, // hydrated lazily once pulls are loaded for the repo
    desc: p.desc || '',
    synced: relTime(p.updatedAt || p.createdAt),
    defaultBranch: p.defaultBranch || 'main',
  }
}

// GET /api/analyses/:id -> analysis shape consumed by the workspace/report views.
export function normalizeAnalysis(a) {
  return {
    id: a.id,
    status: a.status,
    isStale: !!a.is_stale,
    errorMessage: a.error_message || '',
    respondent: a.respondent || '—',
    when: a.when ? relTime(a.when) : '',
    reverseSpec: a.reverse_spec || '',
    spec: a.original_spec || '',
    gaps: (a.gaps || []).map((g) => ({
      id: g.id,
      type: g.type,
      severity: g.severity,
      title: g.title,
      description: g.description,
      question: g.question || '',
      answer: g.answer || '',
      // surfaced so saveAnswer() can target the question (one per gap)
      questionId: g.question_id || null,
    })),
  }
}
