# Backend — Module Reference

What every module does, folder by folder. Pair this with [`FLOW.md`](FLOW.md) (how they interact at runtime) and [`README.md`](README.md) (how to run).

**Architecture:** strict **Route → Controller → Service** layering.
- **Routes** declare paths + attach middleware + carry Swagger JSDoc. No logic.
- **Controllers** validate input (Joi), call services, shape the HTTP response. No business logic.
- **Services** hold the business logic — DB access, GitHub calls, Claude runs. They `throw httpError(...)`; they never touch `req`/`res`.
- **lib/** holds shared singletons and helpers. **config/** holds tunables. **prompts/** holds the AI instructions. **types/** holds shared contracts.

---

## `src/index.ts` — entry point
Boots Express: loads env, registers `cors` + body parsers, mounts Swagger UI at `/api-docs`, mounts all routes under `/api/v1`, and attaches the global `errorHandler` last. Starts listening on `PORT` (default 3000).

---

## `src/routes/` — endpoint declarations
| File | Mounts | Endpoints |
|------|--------|-----------|
| `index.ts` | `/api/v1` | `/health`; wires in the routers below + `POST /compare-spec` |
| `userRoutes.ts` | `/` | `GET /auth/github`, `GET /auth/github/callback` |
| `projectRoutes.ts` | `/projects` | `GET /`, `POST /sync`, `GET /:id/pulls` |
| `analysisRoutes.ts` | `/analyses` | `POST /`, `GET /:id`, `PATCH /:id/spec`, `PATCH /:id/answers`, `POST /:id/submit`, `GET /:id/export`, `POST /:id/retrigger` |
| `fileRoutes.ts` | `/files` | `POST /upload-test`, `POST /presigned-url`, `POST /register` (multer memory storage) |

All protected routes attach the `authenticate` middleware. Each route carries `@swagger` JSDoc that powers `/api-docs`.

---

## `src/controllers/` — request/response handling
| File | Responsibility |
|------|----------------|
| `userController.ts` | GitHub OAuth: redirect to consent (`scope=user:email repo`), handle callback — exchange code for token, fetch GitHub user, upsert `User` (persisting `oauthToken`), seed `Project` rows from the user's repos, sign and return a JWT. |
| `projectController.ts` | `listProjects` (DB-mirrored repos), `syncProjectsController` (re-sync from GitHub), `getProjectPullsController` (live open PRs). Validates UUIDs with Joi. |
| `analysisController.ts` | The full analysis surface: `triggerAnalysis`, `getAnalysis` (poll + stale detection), `provideSpecController`, `saveAnswer`, `submitAnalysis`, `exportAnalysis`, `retriggerController`. Owns Joi schemas, the `assertRespondent` guard, and `buildMarkdown()` for the Decision Record export. |
| `compareController.ts` | Stateless `POST /compare-spec` — validates `reverseSpec` + `originalSpec`/`originalSpecs[]`, runs steps 2+3, returns gaps+questions. No auth, no DB. |
| `uploadController.ts` | S3 helpers: `getPresignedUrl`, `saveFileRecord` (writes a `File` row), `testUpload` (stub). |

---

## `src/services/` — business logic
| File | Responsibility |
|------|----------------|
| `analysisService.ts` | **Pipeline orchestrator.** `createAnalysis` (per-PR lock, creates row, fires background job), `provideSpec`, `retriggerAnalysis`. Background jobs `runAnalysisPipeline` (step 1) and `runSpecComparison` (steps 2+3) update `Analysis.status` at each boundary; `markFailed` handles errors. Jobs run via `setImmediate` — never awaited by controllers. |
| `reverseSpecService.ts` | **Step 1.** `generateReverseSpec(diff)` → Claude (no tools) → parse/validate `ReverseSpecResult` (`files_changed`, `reverse_spec`, `confidence`). Soft-truncates diffs over `MAX_DIFF_CHARS`. |
| `gapAnalysisService.ts` | **Step 2.** `generateGapAnalysis(originalSpec, reverseSpec)` → Claude → validate `Gap[]` against the `GAP_TYPES`/`GAP_SEVERITIES` taxonomy. Accepts a single spec or timestamped versions (latest authoritative). |
| `questionGenerationService.ts` | **Step 3.** `generateQuestions(gaps)` → Claude → one question per gap; `mergeQuestionsIntoGaps` produces frontend-ready `ResolvedGap[]` (gap + question + empty answer). Empty gaps → no questions (code matches spec). |
| `compareService.ts` | Runs steps 2+3 back-to-back (`compareSpec`) for the stateless `/compare-spec` endpoint. |
| `githubService.ts` | GitHub access. `fetchPrDiff` (via `gh` CLI). Octokit helpers using the user's OAuth token: `listUserRepos`, `listOpenPulls`, `getPrHeadSha` (for stale detection). |
| `projectService.ts` | `syncProjects` (upsert GitHub repos into `Project` by `githubRepoId`), `getProjectPulls` (resolve project + token, then `listOpenPulls`). |
| `uploadService.ts` | S3 operations: `uploadBuffer` (raw Buffer, used for generated Markdown), `getPresignedUploadUrl`, `uploadFile` (multer file). |

---

## `src/prompts/` — AI instructions (one file per pipeline step)
| File | Exports |
|------|---------|
| `reverseSpec.ts` | `REVERSE_SPEC_SYSTEM_PROMPT`, `buildReverseSpecUserPrompt(diff)`. Behaviour-only reverse engineering; the model is NOT shown the original spec. |
| `gapAnalysis.ts` | `GAP_ANALYSIS_SYSTEM_PROMPT`, `buildGapAnalysisUserPrompt(...)`, and the **source-of-truth taxonomy** `GAP_TYPES` / `GAP_SEVERITIES` + `SpecVersion` type. Compares intended vs actual behaviour. |
| `questionGeneration.ts` | `QUESTION_GENERATION_SYSTEM_PROMPT`, `buildQuestionGenerationUserPrompt(gaps)`. Turns each gap into one specific, answerable, behaviour-focused question. |
| `index.ts` | Barrel re-export of all three. |

Every prompt enforces the same discipline: describe/probe **behaviour, never implementation**, and **return raw JSON only**.

---

## `src/lib/` — shared singletons & helpers
| File | Responsibility |
|------|----------------|
| `claudeRunner.ts` | The headless-Claude wrapper. `runClaude(opts)` spawns `claude --print --output-format json`, sends the prompt via **stdin** (never as an arg), parses the JSON envelope into `{ result, sessionId, costUsd, numTurns, durationMs, isError, raw }`. `streamClaude` for future streaming. `buildArgs` builds argv. Never passes `--bare` (would break subscription auth). |
| `prisma.ts` | Single `PrismaClient` (pg `Pool` + `PrismaPg` adapter). Cached on `globalThis` in non-production to survive hot reloads. Generated client lives at `generated/prisma/`. |
| `s3.ts` | The AWS S3 client. |
| `httpError.ts` | `httpError(statusCode, message)` → an `Error` carrying `.statusCode`, consumed by the global error handler. The standard way to raise HTTP errors anywhere. |
| `langchain.ts` | Pre-configured `ChatOpenAI` singleton. **Currently unused** — the pipeline uses Claude headless, not OpenAI. Left in place from the original scaffold. |

---

## `src/middleware/`
| File | Responsibility |
|------|----------------|
| `auth.ts` | `authenticate` — verifies the `Authorization: Bearer <jwt>`, decodes `{ userId }`, sets `req.userId`. Exports the `AuthRequest` type (Express `Request` + `userId`). 401 on missing/invalid token. |
| `errorHandler.ts` | Global Express error handler. Reads `.statusCode` (default 500) and responds `{ error: message }`. Defines the `AppError` interface. |

---

## `src/config/`
| File | Responsibility |
|------|----------------|
| `claude.ts` | Env-overridable engine tunables: `CLAUDE_MODEL` (default `sonnet`), `CLAUDE_MAX_BUDGET_USD` (runaway guard, default 1.0), `CLAUDE_PERMISSION_MODE` (`default`), `MAX_DIFF_CHARS` (soft diff cap, 200k). |

---

## `src/types/`
| File | Responsibility |
|------|----------------|
| `intentDrift.ts` | Shared contracts for the pipeline: `Confidence`, `ReverseSpecResult`, `RunMeta`, `Gap`/`GapType`/`GapSeverity`, `GapAnalysisResult`, `GapQuestion`/`QuestionSet`, `ResolvedGap`, `CompareResult`. |

---

## `src/scripts/` — fast, no-HTTP test harnesses
| File | Run with |
|------|----------|
| `testReverseSpec.ts` | `npm run test:reverse-spec -- <PR-url \| prNumber [owner/repo]>` — fetches a diff and runs step 1, printing the result + cost. |
| `testGapQuestions.ts` | `npm run test:gap-questions` — exercises steps 2+3 directly. |

---

## `prisma/` — data model
`schema.prisma` defines the domain. Migrations under `prisma/migrations/`.

| Model | Purpose |
|-------|---------|
| `User` | GitHub-authenticated user; stores `oauthToken`, `githubLogin`, `avatarUrl`. |
| `Project` | A GitHub repo (1:1), keyed by `githubRepoId`; `owner`, `name`, `defaultBranch`, `lang`. |
| `File` | An S3 artifact (`s3Key`, `s3Url`) linked to a project. |
| `Analysis` | One pipeline run on a PR. Holds `status` (enum `AnalysisStatus`), `reverseSpec`, `originalSpec`, `prHeadSha` (stale detection), `respondentId`, `costUsd`, `sessionId`. Unique on `(projectId, prNumber)` — the per-PR lock. |
| `Gap` | A behavioural divergence (`type`, `severity`, `title`, `description`), cascade-deleted with its analysis. |
| `Question` | One question per gap, with the Respondent's `answer` (nullable). Cascade-deleted with its gap. |

`AnalysisStatus`: `analyzing → ready → comparing → questions_ready → completed`, plus `failed`.

---

## Conventions cheat-sheet
- **CommonJS** with **`.js` import extensions** in `src/` (e.g. `./routes/index.js`) — ts-node/tsx resolve them to `.ts` at runtime.
- Raise errors with `throw httpError(status, msg)`; let the global handler format them.
- Prisma client is imported from `../../generated/prisma/index.js`, **not** `@prisma/client`. Run `npm run prisma:generate` after any schema change.
- AI work goes through `runClaude` with `tools: []` — text in, JSON out. Never give the model tools for these steps.
- **Never read `.env`** — it holds real secrets; `.env.example` is the reference.
