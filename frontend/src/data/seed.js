// ============================================================
// SEED DATA — ported verbatim from the Intent Drift design prototype.
//
// This is demo/fixture data so the frontend is fully interactive
// WITHOUT a backend. Every export here maps to a real API response
// once backend integration lands — see src/api/client.js for the
// endpoint contracts that should replace these fixtures.
// ============================================================

// GET /api/projects  ->  repos[]
export function repos() {
  return [
    { id: 'payments-api', owner: 'acme', name: 'payments-api', lang: 'TypeScript', langColor: '#3178C6', openPRs: 4, desc: 'Core payment processing & settlement service', synced: '2h ago' },
    { id: 'web-app', owner: 'acme', name: 'web-app', lang: 'TypeScript', langColor: '#3178C6', openPRs: 3, desc: 'Customer-facing web application', synced: '40m ago' },
    { id: 'auth-service', owner: 'acme', name: 'auth-service', lang: 'Go', langColor: '#00ADD8', openPRs: 2, desc: 'Authentication, sessions & OAuth', synced: '5h ago' },
    { id: 'notifications', owner: 'acme', name: 'notifications', lang: 'Node', langColor: '#539E43', openPRs: 5, desc: 'Email, SMS & push notification dispatch', synced: 'just now' },
    { id: 'mobile-ios', owner: 'acme', name: 'mobile-ios', lang: 'Swift', langColor: '#F05138', openPRs: 2, desc: 'Native iOS client', synced: '1d ago' },
    { id: 'billing', owner: 'acme', name: 'billing', lang: 'Java', langColor: '#B07219', openPRs: 3, desc: 'Subscription & invoicing engine', synced: '3h ago' },
    { id: 'data-pipeline', owner: 'acme', name: 'data-pipeline', lang: 'Python', langColor: '#3572A5', openPRs: 1, desc: 'ETL & analytics ingestion', synced: '6h ago' },
    { id: 'admin-portal', owner: 'acme', name: 'admin-portal', lang: 'TypeScript', langColor: '#3178C6', openPRs: 2, desc: 'Internal operations dashboard', synced: '30m ago' },
  ]
}

// GET /api/projects/:id/pulls  ->  prs for that repo (filter by repoId)
export function prs() {
  // prKey = `${repoId}#${number}`
  return [
    { repoId: 'payments-api', number: 142, title: 'Refactor notification scheduler', author: 'maya-chen', branch: 'fix/notif-cadence', add: 142, del: 38, files: 7 },
    { repoId: 'payments-api', number: 139, title: 'Add idempotency keys to charge endpoint', author: 'devon-r', branch: 'feat/idempotency', add: 96, del: 12, files: 4 },
    { repoId: 'payments-api', number: 135, title: 'Tighten retry backoff window', author: 'sara-i', branch: 'chore/retry', add: 34, del: 21, files: 2 },
    { repoId: 'payments-api', number: 131, title: 'Migrate to decimal currency type', author: 'maya-chen', branch: 'refactor/decimal', add: 210, del: 140, files: 12 },
    { repoId: 'web-app', number: 312, title: 'New checkout flow', author: 'devon-r', branch: 'feat/checkout-v2', add: 520, del: 60, files: 18 },
    { repoId: 'web-app', number: 308, title: 'Fix session timeout redirect', author: 'sara-i', branch: 'fix/session', add: 24, del: 8, files: 2 },
    { repoId: 'web-app', number: 301, title: 'Add dark mode toggle', author: 'maya-chen', branch: 'feat/dark-mode', add: 88, del: 4, files: 6 },
    { repoId: 'auth-service', number: 88, title: 'Rotate refresh tokens on use', author: 'devon-r', branch: 'sec/rotate-refresh', add: 140, del: 36, files: 5 },
    { repoId: 'auth-service', number: 84, title: 'Add rate limiting to login', author: 'sara-i', branch: 'feat/rate-limit', add: 60, del: 5, files: 3 },
    { repoId: 'notifications', number: 211, title: 'Batch digest emails hourly', author: 'maya-chen', branch: 'feat/digest', add: 118, del: 20, files: 6 },
    { repoId: 'notifications', number: 206, title: 'Add Slack channel support', author: 'devon-r', branch: 'feat/slack', add: 90, del: 2, files: 4 },
    { repoId: 'mobile-ios', number: 54, title: 'Offline transaction queue', author: 'sara-i', branch: 'feat/offline', add: 230, del: 18, files: 9 },
    { repoId: 'billing', number: 73, title: 'Prorate mid-cycle plan changes', author: 'devon-r', branch: 'feat/proration', add: 160, del: 44, files: 7 },
    { repoId: 'billing', number: 69, title: 'Add invoice CSV export', author: 'maya-chen', branch: 'feat/csv-export', add: 72, del: 6, files: 3 },
    { repoId: 'data-pipeline', number: 40, title: 'Hotfix stock reconciliation', author: 'sara-i', branch: 'hotfix/recon', add: 88, del: 60, files: 5 },
    { repoId: 'admin-portal', number: 19, title: 'Bulk user import endpoint', author: 'devon-r', branch: 'feat/bulk-import', add: 130, del: 8, files: 5 },
  ]
}

// GET /api/analyses/:id  ->  one analysis (status + reverseSpec + gaps[] + answers)
// Keyed here by `${repoId}#${prNumber}` for the demo. reverseSpec is stored as
// Markdown and rendered with react-markdown (see SPEC.md note on markdown output).
export function seedAnalyses() {
  const A = {}
  A['payments-api#142'] = {
    status: 'completed', isStale: false, respondent: 'maya-chen', when: 'Today, 09:14', specVersion: 'v2.1',
    reverseSpec: 'The changed files implement a **notification scheduler**. A cron job runs every 4 hours and dispatches queued notifications in batches of 100. Retries use exponential backoff capped at 15 minutes. A new `/metrics` endpoint exposes queue depth and dispatch latency. No per-user rate limiting is present.',
    gaps: [
      { id: 'g1', type: 'missing_feature', severity: 'high', title: 'Hourly notification cadence not implemented', description: 'The spec requires notifications to be dispatched every hour. The scheduler runs on a 4-hour cron interval, delaying time-sensitive alerts.', question: 'Was the 4-hour interval an intentional change, or should the scheduler be corrected to dispatch hourly as the spec requires?', answer: 'Not intentional — this was a leftover from local testing. Corrected to hourly in a follow-up commit and verified against the spec.' },
      { id: 'g2', type: 'deviation', severity: 'medium', title: 'Retry backoff cap differs from spec', description: 'The spec defines exponential backoff capped at 5 minutes. The implementation caps backoff at 15 minutes.', question: 'Is the 15-minute backoff cap acceptable, or must it match the 5-minute cap defined in the spec?', answer: '15 minutes is acceptable for now — payment provider guidance changed after the spec was written. We will update the spec to 15m rather than change the code.' },
      { id: 'g3', type: 'undocumented_addition', severity: 'low', title: 'Undocumented /metrics endpoint', description: 'The implementation exposes a /metrics endpoint that is not described anywhere in the specification.', question: 'Should the /metrics endpoint be documented in the spec, or removed before merge?', answer: 'Keep it — it is needed for the on-call dashboard. Added a section to the spec describing the endpoint and its auth.' },
    ],
  }
  A['payments-api#139'] = {
    status: 'questions_ready', isStale: false, respondent: 'devon-r', when: 'Today, 11:02',
    reverseSpec: 'The charge endpoint now accepts an `Idempotency-Key` header. Keys are stored in Redis with a 1-hour TTL. A duplicate key within the window returns the cached response. There is no explicit 409 conflict path; duplicate keys silently return the original result.',
    gaps: [
      { id: 'g1', type: 'deviation', severity: 'high', title: 'Idempotency key TTL shorter than spec', description: 'The spec requires idempotency keys to be retained for 24 hours. The implementation expires them after 1 hour.', question: 'Should the TTL be extended to 24 hours to match the spec, or is the 1-hour window an intentional cost optimization?', answer: '' },
      { id: 'g2', type: 'missing_feature', severity: 'medium', title: 'No conflict response for in-flight duplicates', description: 'The spec calls for a 409 Conflict response when a request with the same key is still being processed. The code returns the cached success response instead.', question: 'How should concurrent requests with the same idempotency key behave — return 409 as specified, or keep the current cached-response behaviour?', answer: '' },
    ],
  }
  A['payments-api#135'] = {
    status: 'ready', isStale: false, respondent: 'sara-i', when: '2h ago',
    reverseSpec: 'The retry logic now applies exponential backoff. The base interval is 30 seconds, doubling on each attempt. No explicit cap is set — the retry loop runs until the circuit breaker opens. Error classification distinguishes transient from permanent failures.',
    gaps: [],
  }
  A['web-app#312'] = {
    status: 'completed', isStale: true, respondent: 'devon-r', when: 'Yesterday, 18:40', specVersion: 'v1.4',
    reverseSpec: 'A new **multi-step checkout flow** with three steps: cart review, shipping, and payment. State is held in a React context and persisted to `sessionStorage`. Guest checkout is supported. The payment step posts directly to `/api/charge` without a confirmation interstitial.',
    gaps: [
      { id: 'g1', type: 'missing_feature', severity: 'high', title: 'Order confirmation step missing', description: 'The spec defines a final confirmation screen before charging. The implementation charges immediately on the payment step.', question: 'Should a confirmation interstitial be added before the charge call, per the spec?', answer: 'Yes — a confirmation step was required for chargeback compliance. Added before merge.' },
      { id: 'g2', type: 'deviation', severity: 'low', title: 'Guest checkout enabled by default', description: 'The spec leaves guest checkout behind a feature flag; the implementation enables it unconditionally.', question: 'Should guest checkout stay behind the feature flag as specified?', answer: 'No — product decided to GA guest checkout. Spec updated to remove the flag.' },
    ],
  }
  A['auth-service#88'] = {
    status: 'failed', isStale: false, respondent: 'devon-r', when: '5h ago', specVersion: 'v3.0',
    errorMessage: 'The reverse-spec step failed: one of the changed files exceeded the model context window (token limit). Reduce the PR size or split the analysis, then retry.',
    reverseSpec: '', gaps: [],
  }
  A['notifications#211'] = {
    status: 'analyzing', isStale: false, respondent: 'maya-chen', when: 'just now', specVersion: null,
    reverseSpec: '', gaps: [],
  }
  A['billing#73'] = {
    status: 'completed', isStale: false, respondent: 'devon-r', when: '2 days ago', specVersion: 'v2.2',
    reverseSpec: 'Mid-cycle plan changes are **prorated** by computing the unused portion of the current period and crediting it against the new plan. Proration is computed in whole days, not seconds. Downgrades take effect immediately rather than at period end.',
    gaps: [
      { id: 'g1', type: 'deviation', severity: 'medium', title: 'Proration computed in days, not seconds', description: 'The spec specifies second-level proration accuracy. The implementation rounds to whole days.', question: 'Is day-level proration acceptable, or must it be second-accurate as specified?', answer: 'Day-level is acceptable for the current pricing tiers. Spec amended to reflect day granularity.' },
      { id: 'g2', type: 'missing_feature', severity: 'high', title: 'Downgrades not deferred to period end', description: 'The spec requires downgrades to take effect at the end of the billing period. The code applies them immediately.', question: 'Should downgrades be deferred to period end as the spec requires?', answer: 'Yes — applying immediately caused revenue leakage. Fixed to defer to period end before merge.' },
    ],
  }
  A['admin-portal#19'] = {
    status: 'questions_ready', isStale: false, respondent: 'devon-r', when: '1h ago',
    reverseSpec: 'A **bulk user import** endpoint accepts a CSV upload, parses rows, and creates users in a single transaction. There is no row-level validation; a malformed row aborts the entire batch. No audit log entry is written for the import.',
    gaps: [
      { id: 'g1', type: 'missing_feature', severity: 'high', title: 'No audit log on bulk import', description: 'The spec mandates an audit entry for every administrative mutation. The bulk import writes no audit record.', question: 'Should the bulk import write an audit log entry per created user, or one entry for the batch?', answer: '' },
      { id: 'g2', type: 'deviation', severity: 'medium', title: 'Whole-batch failure on a single bad row', description: 'The spec asks for per-row validation with a partial-success report. The code aborts the whole batch on any malformed row.', question: 'Should the importer switch to per-row validation with a partial-success summary, as specified?', answer: '' },
    ],
  }
  return A
}

// Synthetic outputs used when the user triggers a NEW analysis in the demo.
export function synthReverseSpec() {
  return 'The changed files add the requested behaviour. Inputs are validated at the boundary and errors are surfaced as structured responses. One configuration value is read from an environment variable not referenced in any provided specification.'
}

export function synthGaps() {
  return {
    gaps: [
      { id: 'g1', type: 'deviation', severity: 'medium', title: 'Configuration sourced from environment, not spec', description: 'A behavioural threshold is read from an environment variable rather than the value fixed in the specification.', question: 'Should this threshold be pinned to the spec value, or is environment-level override intended?', answer: '' },
      { id: 'g2', type: 'undocumented_addition', severity: 'low', title: 'Added debug logging path', description: 'The implementation introduces a verbose debug logging path not mentioned in the spec.', question: 'Should the debug logging be documented in the spec or gated behind a flag before merge?', answer: '' },
    ],
  }
}

// The signed-in GitHub user (GET /auth/github/callback establishes this session).
export const CURRENT_USER = 'maya-chen'
