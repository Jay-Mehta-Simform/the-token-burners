// ============================================================
// BACKEND INTEGRATION LAYER (STUBBED)
//
// The frontend currently runs entirely on local fixture state (see
// src/data/seed.js and the reducer in src/App.jsx). NONE of these
// functions are wired up yet — they document the exact API contract
// the backend (backend/, Node + Express, see specs/SPEC.md §7) must
// satisfy. To go live: implement each fetch below, then replace the
// fixture/reducer calls in App.jsx with these (search for
// "// BACKEND:" markers in the components).
//
// All requests are same-origin; Vite proxies /api and /auth to :3000
// (see vite.config.js). Auth is a GitHub-OAuth session cookie set by
// /auth/github/callback — no token ever reaches the browser.
// ============================================================

const json = (res) => {
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json()
}

// --- Auth -----------------------------------------------------------------
// GET /auth/github  -> 302 redirect to GitHub's OAuth consent screen.
// The "Continue with GitHub" button should navigate the browser here.
export function beginGithubOAuth() {
  window.location.href = '/auth/github'
}
// GET /auth/github/callback -> creates/looks up the user, stores the
// encrypted OAuth token, sets a session cookie, redirects back to the app.
// (Handled entirely server-side; nothing to call from the SPA.)

// GET /api/me -> { github_login } for the current session (used to populate
// the sidebar identity + Settings). 401 when logged out.
export function getCurrentUser() {
  return fetch('/api/me').then(json)
}

export function logout() {
  return fetch('/auth/logout', { method: 'POST' })
}

// --- Projects (repositories) ---------------------------------------------
// GET /api/projects -> [{ id, owner, name, lang, langColor, openPRs, desc, synced }]
// Repos the user has GitHub access to, synced one-to-one with GitHub.
export function listProjects() {
  return fetch('/api/projects').then(json)
}

// POST /api/projects/sync -> re-sync the repo list from GitHub. Returns the
// refreshed projects array. Backs the "Re-sync repositories" button.
export function resyncProjects() {
  return fetch('/api/projects/sync', { method: 'POST' }).then(json)
}

// GET /api/projects/:id/pulls -> [{ number, title, author, branch, add, del, files }]
// Open pull requests for one repo (GitHub REST API under the hood).
export function listPulls(projectId) {
  return fetch(`/api/projects/${projectId}/pulls`).then(json)
}

// --- Analyses -------------------------------------------------------------
// POST /api/analyses  body: { project_id, pr_number, original_spec? }
// Triggers an Analysis. Locks the PR (first-write-wins); rejected with 409
// "Analysis already in progress" if one is already `analyzing`. The caller
// becomes the Respondent. Returns { analysis_id }.
//
// NOTE: in this design the spec is OPTIONAL at trigger time — step 1
// (reverse spec) runs immediately; the spec is provided afterwards via
// the "Compare against spec" action to run gap analysis + questions.
export function triggerAnalysis({ projectId, prNumber, originalSpec }) {
  return fetch('/api/analyses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: projectId, pr_number: prNumber, original_spec: originalSpec }),
  }).then(json)
}

// PATCH /api/analyses/:id  body: { original_spec }
// Provides the spec after the reverse spec is ready, kicking off gap analysis
// + question generation. (Backs the "Compare against spec" button.) The design
// treats this as a second phase; the backend may fold it into POST /api/analyses.
export function provideSpec(analysisId, originalSpec) {
  return fetch(`/api/analyses/${analysisId}/spec`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ original_spec: originalSpec }),
  }).then(json)
}

// GET /api/analyses/:id -> full analysis:
//   { id, status, is_stale, error_message, respondent, when,
//     reverse_spec (markdown string),
//     gaps: [{ id, title, description (markdown), type, severity,
//              question, answer }] }
// status ∈ analyzing | ready | comparing | questions_ready | completed | failed
// Poll this while status is `analyzing` or `comparing`.
export function getAnalysis(analysisId) {
  return fetch(`/api/analyses/${analysisId}`).then(json)
}

// PATCH /api/analyses/:id/answers  body: { question_id, answer }
// Saves a single answer. Only the Respondent may call this.
export function saveAnswer(analysisId, questionId, answer) {
  return fetch(`/api/analyses/${analysisId}/answers`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_id: questionId, answer }),
  }).then(json)
}

// POST /api/analyses/:id/submit -> sets status `completed`.
// Rejected (422) unless every question has a non-empty answer.
export function submitAnalysis(analysisId) {
  return fetch(`/api/analyses/${analysisId}/submit`, { method: 'POST' }).then(json)
}

// GET /api/analyses/:id/export -> Decision Record as a Markdown file
// (text/markdown attachment). Backs every "Download Markdown" button.
export function exportUrl(analysisId) {
  return `/api/analyses/${analysisId}/export`
}

// POST /api/analyses/:id/retrigger -> re-run on the latest commit; resets all
// answers and clears the stale flag. Respondent only. Returns 202.
export function retriggerAnalysis(analysisId) {
  return fetch(`/api/analyses/${analysisId}/retrigger`, { method: 'POST' }).then((res) => {
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res
  })
}
