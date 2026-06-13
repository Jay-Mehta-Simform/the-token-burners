# Intent Drift — Backend Development Plan

> Exhaustive plan to take the backend from its **post-PR-#1 state** to a complete API
> that satisfies `SPEC.md §7` and the implemented frontend (`frontend/src/api/client.js`).
> This is a plan only — no code here.

---

## 1. Baseline — what exists after PR #1 merges

PR #1 (`feat/claude-headless-demo`) lands the **AI flow, step 1 only**, plus GitHub OAuth
and S3 file upload. Concretely:

**Routes present**
- `GET  /api/health`
- `GET  /auth/github` · `GET /auth/github/callback` — GitHub OAuth → returns a **JWT** in the JSON body
- `GET  /api/projects` — returns the user's **DB** projects (+files); not GitHub-synced
- `POST /api/files/upload-test` · `POST /api/files/presigned-url` · `POST /api/files/register` — S3 upload
- `POST /api/analyses` — auth'd; body `{ prUrl, projectId }`; runs **step 1 synchronously**: `gh pr diff` → Claude reverse spec (structured JSON) → Markdown → S3 → **`File` record**. Returns `{ prNumber, repo, reverseSpec, meta, s3Url, s3Key, fileId }`.

**AI pipeline**
- Step 1 (reverse spec) is wired (`reverseSpecService` → `claudeRunner`, headless Claude, subscription auth).
- Step 2 (gap analysis) & Step 3 (question generation) prompts exist (`prompts/gapAnalysis.ts`, `prompts/questionGeneration.ts`) and types are stubbed (`types/intentDrift.ts`) but are **not wired** into any service/controller.
- Diff is fetched via the local **`gh` CLI** with ambient auth — not the user's OAuth token, and it's a **diff**, not full file contents.

**Schema** (`prisma/schema.prisma`) — only `User`, `Project`, `File`. No analysis/gap/question domain.

**Auth model** — stateless **JWT Bearer** (`Authorization: Bearer <jwt>`), `JWT_SECRET`. The GitHub OAuth token is **used once and discarded** (not persisted). OAuth scope is `user:email` only.

### Key gaps vs. target
1. No persisted analysis domain (status, reverse_spec, gaps, questions, answers, stale, respondent).
2. Pipeline is synchronous; SPEC + frontend require **async + polling**.
3. Only step 1 runs; gap analysis + question generation not wired.
4. No PR-list endpoint; projects aren't GitHub-synced.
5. No answer/submit/export endpoints; no concurrency lock or stale detection.
6. GitHub access uses local `gh` CLI + diff, not per-user OAuth + full changed-file contents.
7. Request/response shapes differ from SPEC and the frontend client.

---

## 2. Decisions to settle first (they shape every endpoint)

| # | Decision | Recommendation |
|---|---|---|
| D1 | **Auth transport** — JWT Bearer (PR #1) vs session cookie (frontend `client.js` assumed). | **Keep JWT Bearer.** It's already built. Update the frontend to store the JWT and send `Authorization: Bearer`. Add `GET /api/me`. (`client.js` currently assumes a cookie — must be reconciled either way.) |
| D2 | **Spec timing** — SPEC §4 provides the spec at trigger; the built UI is **two-phase** (analyze → then "Compare against spec"). | **Adopt two-phase** to match the shipped UI: `POST /api/analyses` runs reverse spec; `PATCH /api/analyses/:id/spec` runs gap analysis + questions. Update SPEC §4 to reflect optional/after-the-fact spec. |
| D3 | **Code Input** — SPEC §3 says *full file contents of changed files*; PR #1 feeds a **diff**. | Move to **full changed-file contents** via GitHub REST for fidelity, OR keep the diff and amend SPEC §3. Pick one; the reverse-spec prompt quality depends on it. |
| D4 | **GitHub access** — local `gh` CLI vs per-user OAuth token + REST API. | **Per-user OAuth token + REST (Octokit).** Required for multi-user correctness and to list each user's repos/PRs. Needs `repo` scope and encrypted token storage. |
| D5 | **Async execution** — how the pipeline runs in the background. | For the MVP, a **fire-and-forget in-process job** writing status to the DB is enough (frontend polls). Note it doesn't survive restarts; a queue (BullMQ/Redis) is the production upgrade. |
| D6 | **reverse_spec storage** — DB column vs S3 markdown (PR #1). | Store `reverse_spec` as **text (Markdown) on the `Analysis` row** (source of truth; what the UI renders). Keep the S3 Markdown as an **optional export artifact**, not the primary store. |

---

## 3. Schema changes (Prisma)

**Modify `User`** — persist the encrypted GitHub OAuth token (SPEC §10 "encrypt at rest").
- add `oauthToken String?` (encrypted at rest), `githubLogin String?`.

**Modify `Project`** — make it a true 1:1 GitHub repo mirror (SPEC §6).
- add `githubRepoId String @unique`, `owner String`, `name String` (already has `name`), `defaultBranch String?`, `lang String?`. Keep `userId` (who linked it).

**New `Analysis`**
- `id`, `projectId → Project`, `prNumber Int`, `prHeadSha String` (stale detection), `respondentId → User`, `originalSpec String?`, `reverseSpec String?` (Markdown), `status enum(analyzing|ready|comparing|questions_ready|completed|failed)`, `isStale Boolean @default(false)`, `errorMessage String?`, `costUsd`, `sessionId`, `createdAt`, `completedAt DateTime?`.
- unique/active constraint to enforce **one active analysis per (projectId, prNumber)** (concurrency lock).

**New `Gap`**
- `id`, `analysisId → Analysis`, `title`, `description` (Markdown), `type enum(missing_feature|deviation|undocumented_addition)`, `severity enum(high|medium|low)`.

**New `Question`**
- `id`, `gapId → Gap`, `text` (Markdown), `answer String?`.

> Status enum extends SPEC's `analyzing→ready→completed|failed` with `comparing` and
> `questions_ready` to match the two-phase UI (D2). Decision Record is not a table — it's the
> rendered/export view of a `completed` Analysis joined with gaps + questions.

Migration: one new migration adding the three models + the `User`/`Project` columns; then
`prisma:generate`.

---

## 4. API surface — implement / modify / remove

Legend: 🟢 implement (new) · 🟡 modify (exists, change) · 🔴 remove/deprecate · ⚪ keep as-is

### Auth & session
| Status | Method · Endpoint | Change |
|---|---|---|
| 🟡 | `GET /auth/github` | Add `repo` (or `repo:status`+`public_repo`) to OAuth scope so we can list repos/PRs. |
| 🟡 | `GET /auth/github/callback` | **Persist the OAuth token encrypted** on `User` (currently discarded). Keep returning the JWT. Consider redirecting to the SPA with the token rather than raw JSON. |
| 🟢 | `GET /api/me` | Return `{ id, githubLogin, name, avatarUrl }` for the current JWT. Frontend sidebar/Settings need it. |
| 🟢 | `POST /auth/logout` | Optional with stateless JWT (client can just drop the token). Implement only if you add token denylist/refresh. |

### Projects (repositories)
| Status | Method · Endpoint | Change |
|---|---|---|
| 🟡 | `GET /api/projects` | Today returns DB projects only. Make it **return GitHub-synced repos** for the user (sync-on-read, or read DB mirror refreshed by sync). Response per SPEC: `{ id, owner, name, lang, openPRs, ... }`. |
| 🟢 | `POST /api/projects/sync` | Re-sync repo list from GitHub REST (`GET /user/repos`), upsert `Project` rows. Backs the "Re-sync repositories" button. |
| 🟢 | `GET /api/projects/:id/pulls` | List **open PRs** for the repo via GitHub REST (`GET /repos/{owner}/{repo}/pulls?state=open`). Response per PR: `{ number, title, author, branch, add, del, files }`. |

### Analyses (the AI pipeline)
| Status | Method · Endpoint | Change |
|---|---|---|
| 🟡 | `POST /api/analyses` | **Rework.** Body → `{ project_id, pr_number, original_spec? }` (was `{ prUrl, projectId }`). Behaviour: acquire the per-PR **lock (first-write-wins, 409 if active)**; snapshot `prHeadSha`; set caller as **Respondent**; create `Analysis(status=analyzing)`; **return `{ analysis_id }` immediately**; run reverse spec in the **background** (D5). On success → `status=ready` (or straight to `comparing` if `original_spec` was supplied). On failure → `status=failed` + `errorMessage`. Persist `reverseSpec` on the row (D6). |
| 🟢 | `PATCH /api/analyses/:id/spec` | Provide/replace the original spec after reverse spec is ready → set `status=comparing`, run **step 2 (gap analysis)** then **step 3 (question generation)** in the background, persist `Gap`/`Question` rows → `status=questions_ready`. Backs "Compare against spec". (Per D2; SPEC may fold this into POST.) |
| 🟢 | `GET /api/analyses/:id` | **Polling endpoint.** Return the full analysis: `{ id, status, is_stale, error_message, respondent, reverse_spec, gaps:[{...,question,answer}], created_at, completed_at }`. Authorized to all repo members (read), Respondent (write). |
| 🟢 | `PATCH /api/analyses/:id/answers` | Save one answer `{ question_id, answer }`. **Respondent-only** (403 otherwise). |
| 🟢 | `POST /api/analyses/:id/submit` | Gate on **every question answered** (422 otherwise) → `status=completed`, set `completedAt`. Respondent-only. |
| 🟢 | `GET /api/analyses/:id/export` | Stream the Decision Record as **`text/markdown`** (server-side build mirroring `frontend/src/lib/derive.js#buildMarkdown`). |
| 🟢 | `POST /api/analyses/:id/retrigger` (or reuse POST) | Re-run on the latest commit; **resets all answers**; clears `isStale`. Can be the same handler as POST with replace semantics. |

### Stale detection (cross-cutting, not its own endpoint)
- On `GET /api/analyses/:id` and `GET /api/projects/:id/pulls`, compare the **current PR head SHA** (GitHub) against `analyses.prHeadSha`; set/return `is_stale=true` when they differ. Never auto-retrigger.

### Files / S3 (existing)
| Status | Method · Endpoint | Change |
|---|---|---|
| ⚪/🟡 | `POST /api/files/presigned-url`, `POST /api/files/register` | Keep for **spec file upload** (paste-or-upload at trigger). Wire the registered file into `Analysis.originalSpec` (read its content) instead of a loose `File`. |
| 🔴 | `POST /api/files/upload-test` | **Remove** — it's a stub ("not fully implemented for new schema"), no production use. |

---

## 5. AI pipeline work (wire steps 2 & 3)

1. **`gapAnalysisService`** — input: `reverse_spec` + `original_spec`; call Claude with `prompts/gapAnalysis.ts`; parse/validate to `GapAnalysisResult` (`types/intentDrift.ts` already has the shape); persist `Gap` rows. Reuse the JSON-parse-and-validate pattern from `reverseSpecService`.
2. **`questionGenerationService`** — input: the gaps; call Claude with `prompts/questionGeneration.ts`; persist one-or-more `Question` rows per gap.
3. **Orchestrator** — extend `analysisService` so the background job runs step 1 on trigger and steps 2→3 on spec-provide, updating `Analysis.status` at each boundary and capturing `RunMeta` (cost/turns/session) per call.
4. **Markdown vs JSON** (see `SPEC.md` "Markdown vs JSON outputs"): reverse spec is stored/returned as **Markdown**; gaps & questions stay **structured records** with Markdown-capable text fields. The frontend already renders accordingly.
5. **Failure handling** — any Claude call failing → `status=failed` + `errorMessage`; never leave a stuck `analyzing`/`comparing`. Add a timeout/watchdog.

---

## 6. GitHub integration changes (`githubService`)
- Replace local `gh pr diff` with **Octokit using the user's stored OAuth token**.
- `listRepos(user)`, `listOpenPulls(owner, repo)`, `getPullHeadSha(owner, repo, n)`, and **`getChangedFileContents(owner, repo, n)`** (`GET .../pulls/{n}/files` → fetch each file's content at the head ref) per SPEC §3 (D3).
- Keep the diff path only if D3 chooses diff; otherwise delete it.

---

## 7. Cross-cutting / non-functional
- **Encryption at rest** for `User.oauthToken` (SPEC §10) — e.g. AES-GCM with a `TOKEN_ENC_KEY` env var; never log it; never send to the frontend.
- **Authorization rules** — read endpoints: any repo member; write (answers/submit/spec/retrigger): **Respondent only**.
- **Validation** — request bodies (zod or manual) returning `400`; surface pipeline errors as `502` (already the pattern via `httpError`).
- **Env vars (new)** — `GITHUB_CLIENT_ID/SECRET` (exist), `TOKEN_ENC_KEY`, optional `REDIS_URL` (if queue), `APP_BASE_URL` (OAuth redirect). Add to `.env.example`.
- **Swagger** — add JSDoc blocks for every new route (pattern already in `userRoutes.ts`/`fileRoutes.ts`).
- **Frontend reconciliation** — update `frontend/src/api/client.js`: send `Authorization: Bearer`, store the JWT from the callback, and align method/path/body names (`project_id`/`pr_number`, `PATCH /:id/spec`). The `// BACKEND:` markers in the UI are the wiring points.

---

## 8. Suggested build order
1. **Schema + migration** (§3) → `prisma:generate`. Unblocks everything.
2. **Auth hardening** (§4 auth): persist encrypted token, `repo` scope, `GET /api/me`.
3. **Projects**: `GET /api/projects` (synced) + `POST /api/projects/sync` + `GET /api/projects/:id/pulls`. (GitHub REST in `githubService`.)
4. **Analyses core**: rework `POST /api/analyses` (async + lock + Respondent), `GET /api/analyses/:id` (polling), stale detection.
5. **Pipeline steps 2–3** + `PATCH /api/analyses/:id/spec`.
6. **Answers / submit / export** endpoints.
7. **Retrigger** + cleanup (remove `upload-test`), Swagger, `.env.example`, frontend client wiring.

---

## 9. One-line summary of each verdict
- **Implement (new):** `GET /api/me`, `POST /api/projects/sync`, `GET /api/projects/:id/pulls`, `PATCH /api/analyses/:id/spec`, `GET /api/analyses/:id`, `PATCH /api/analyses/:id/answers`, `POST /api/analyses/:id/submit`, `GET /api/analyses/:id/export`, `POST /api/analyses/:id/retrigger`, (optional `POST /auth/logout`).
- **Modify:** `GET /auth/github` (scope), `GET /auth/github/callback` (persist token), `GET /api/projects` (GitHub-synced), `POST /api/analyses` (async + new body + lock + Respondent + persist Analysis), file endpoints (feed `originalSpec`), `githubService` (OAuth+REST+full files), schema (User/Project + Analysis/Gap/Question).
- **Remove:** `POST /api/files/upload-test` (stub); the local-`gh`/diff path if D3 picks full file contents.
