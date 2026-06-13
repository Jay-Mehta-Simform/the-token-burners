# Backend — Code Flow

How a request travels through the backend, and how the 3-step AI pipeline runs. Pair this with [`MODULE.md`](MODULE.md) (what each file is) and [`README.md`](README.md) (how to run it).

---

## 1. Server boot & request plumbing

```
src/index.ts
  ├─ dotenv/config              load .env
  ├─ cors()                     allow cross-origin (frontend dev server)
  ├─ express.json() / urlencoded   parse bodies
  ├─ /api-docs                  Swagger UI (swagger-jsdoc reads JSDoc in routes/*.ts)
  ├─ /api/v1  ──▶ routes/index.js   ALL application routes mount here
  └─ errorHandler               LAST — turns thrown AppError into JSON { error }
```

Every route lives under **`/api/v1`**. The router fans out:

```
routes/index.ts
  ├─ /health                      → { status: "ok" }
  ├─ /files      → fileRoutes      (S3 upload helpers)
  ├─ /           → userRoutes      (/auth/github, /auth/github/callback)
  ├─ /projects   → projectRoutes   (list / sync / pulls)
  ├─ /analyses   → analysisRoutes  (the core pipeline endpoints)
  └─ /compare-spec → compareController  (stateless steps 2+3, no DB, no auth)
```

### The universal request path

```
HTTP request
  → Router (routes/*.ts)
  → authenticate middleware        (JWT Bearer → req.userId)        [protected routes]
  → Controller (controllers/*.ts)  validate input (Joi) → call service → shape response
  → Service (services/*.ts)        business logic, DB, GitHub, Claude
  → (on throw) httpError(status, msg) → errorHandler → JSON
```

**Error convention:** anywhere in the stack, `throw httpError(400, "…")`. The error carries `.statusCode`; the global `errorHandler` converts it to `{ error: message }` with that status. No try/catch-to-response in services — they throw, controllers `next(err)`.

**Auth convention:** `authenticate` verifies the `Authorization: Bearer <jwt>` header, decodes `{ userId }`, and sets `req.userId`. Protected controllers read `req.userId!`.

---

## 2. Authentication flow (GitHub OAuth → JWT)

```
Browser ──▶ GET /api/v1/auth/github
                │  302 redirect (scope: user:email + repo)
                ▼
          GitHub consent screen
                │  ?code=…
                ▼
        GET /api/v1/auth/github/callback
                ├─ exchange code → GitHub access_token
                ├─ fetch GitHub user (+ primary email if private)
                ├─ upsert User  (persists oauthToken, githubLogin, avatarUrl)
                ├─ seed Project rows from the user's repos
                └─ sign JWT { userId } ──▶ returned in JSON to the client
```

The GitHub **OAuth token is persisted** on `User.oauthToken` so later Octokit calls (repos, PRs, head SHA) act as that user. The **JWT** is what the frontend sends back on every protected call.

---

## 3. The analysis lifecycle (the heart of the system)

### Status state machine

```
                      POST /analyses (no spec)        PATCH /analyses/:id/spec
                              │                                │
  ┌────────────┐   step 1    ▼          ┌───────────┐  steps 2+3   ▼   ┌──────────────────┐
  │ analyzing  │ ──────────▶ │  ready   │ ─────────▶ │ comparing │ ─────────▶ │ questions_ready  │
  └────────────┘             └───────────┘            └───────────┘            └──────────────────┘
        │                                                                            │
        │  POST /analyses (WITH spec): analyzing → comparing → questions_ready       │ POST /:id/submit
        │                                                                            ▼
        │  any Claude/parse failure                                          ┌──────────────┐
        └─────────────────────────────────────────────────────────────────▶│  completed   │
                                  ▼                                          └──────────────┘
                            ┌──────────┐
                            │  failed  │   (errorMessage set; never a stuck spinner)
                            └──────────┘
```

### Trigger → background pipeline (async, fire-and-forget)

`POST /api/v1/analyses { project_id, pr_number, original_spec? }`

```
triggerAnalysis (controller)
  ├─ Joi validate body
  └─ createAnalysis (analysisService)
       ├─ verify Project exists                          → 404
       ├─ per-PR LOCK: if existing status ∈ {analyzing,comparing} → 409
       ├─ create (or reset) Analysis row, status=analyzing, respondent=caller
       ├─ setImmediate(runAnalysisPipeline)   ← fire-and-forget, NOT awaited
       └─ return { analysis_id }              ← responds 201 immediately
```

The HTTP response returns **before** any AI work. The pipeline runs in the background and writes progress to the `Analysis` row:

```
runAnalysisPipeline(analysisId)               [background job]
  ├─ load Analysis + Project
  ├─ STEP 1 — fetchPrDiff(prNumber, repo)      githubService → `gh pr diff`
  │          generateReverseSpec(diff)         reverseSpecService → Claude (no tools) → JSON
  ├─ persist reverseSpec, costUsd, sessionId
  ├─ status = original_spec ? "comparing" : "ready"
  └─ if original_spec was supplied → runSpecComparison()   (skip the wait)
```

If anything throws, the job's `.catch` calls `markFailed()` → `status=failed` + `errorMessage`.

### Provide spec → gaps & questions

`PATCH /api/v1/analyses/:id/spec { spec }` (Respondent only)

```
provideSpecController → provideSpec (analysisService)
  ├─ guards: must be Respondent (403); not mid-run (409); reverseSpec ready (422)
  ├─ clear old gaps, set originalSpec, status=comparing
  └─ setImmediate(runSpecComparison)           ← background

runSpecComparison(analysisId)                  [background job]
  ├─ STEP 2 — generateGapAnalysis(originalSpec, reverseSpec)   → Gap[]  (persisted)
  ├─ STEP 3 — generateQuestions(gaps)                          → 1 question per gap
  ├─ persist Question rows (mapped gapKey → gap.id)
  └─ status = "questions_ready"
```

### Poll → answer → submit → export

```
GET   /analyses/:id        getAnalysis      poll status; also runs STALE DETECTION
                                            (compare stored prHeadSha vs live GitHub head SHA)
PATCH /analyses/:id/answers saveAnswer      Respondent saves one answer (404 if Q not on analysis)
POST  /analyses/:id/submit  submitAnalysis  requires status=questions_ready AND every Q answered
                                            (else 422) → status=completed, completedAt set
GET   /analyses/:id/export  exportAnalysis  buildMarkdown() → text/markdown attachment
POST  /analyses/:id/retrigger retrigger     reset row, re-run from step 1 on latest commit
```

**Stale detection** is not its own endpoint — `GET /analyses/:id` compares the `prHeadSha` snapshot taken at trigger time against the current PR head (via the respondent's OAuth token). If they differ, `is_stale=true` is set and returned. It never auto-retriggers.

---

## 4. How a single Claude step works

Every AI step (`reverseSpecService`, `gapAnalysisService`, `questionGenerationService`) follows the same shape:

```
buildXxxUserPrompt(input)              prompts/*.ts — wraps input, states JSON contract
  → runClaude({                        lib/claudeRunner.ts
      systemPrompt, prompt,
      model, tools: [],                ← NO tools: pure text in, text out
      permissionMode, maxBudgetUsd,
    })
      → spawn `claude --print --output-format json`
      → prompt sent via STDIN (never as an arg — variadic flags would swallow it)
      → parse JSON envelope { result, session_id, total_cost_usd, … }
  → parseJsonResult(raw)               strip ``` fences → JSON.parse  (502 if unparseable)
  → validateXxx(obj)                   shape/enum checks               (502 if invalid)
  → { result, meta: { costUsd, numTurns, durationMs, sessionId } }
```

Config (model, budget cap, permission mode, diff size cap) is centralised in [`config/claude.ts`](src/config/claude.ts), all env-overridable.

---

## 5. Two GitHub access paths (by design)

| Need | Mechanism | Auth |
|------|-----------|------|
| **PR diff** for reverse spec | `gh pr diff` via `child_process` | ambient `gh` CLI login |
| **Repos / open PRs / head SHA** | Octokit REST | per-user `oauthToken` |

The diff path is the legacy/simple route (text in, no per-user token needed). The Octokit path is required for multi-user correctness (listing each user's repos and PRs, stale detection).

---

## 6. Stateless shortcut: `POST /compare-spec`

`compareController` → `compareService` runs **steps 2 + 3 only**, with **no DB and no auth**. Give it `reverseSpec` + `originalSpec` (or timestamped `originalSpecs[]`, latest wins) and it returns `{ gaps: ResolvedGap[], meta }` directly. Useful for testing the comparison logic or for clients that hold their own state.
