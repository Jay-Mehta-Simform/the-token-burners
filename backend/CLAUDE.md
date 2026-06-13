# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start with hot reload (nodemon + ts-node)
npm run build        # Compile TypeScript to dist/
npm start            # Run compiled output

# Prisma
npm run prisma:generate   # Regenerate client after schema changes
npm run prisma:migrate    # Run migrations (creates migration files)
npx prisma studio         # Open Prisma GUI
```

After any change to `prisma/schema.prisma`, always run `npm run prisma:generate` before running the app.

## Architecture

**Entry point:** `src/index.ts` — boots Express, registers middleware, mounts all routes under `/api`, and attaches the global error handler last.

**Route → Controller → Service pattern:**
- `src/routes/` — express Router definitions, no logic
- `src/controllers/` — request/response handling, input validation
- `src/services/` — business logic, DB calls, LangChain interactions

**Shared singletons (`src/lib/`):**
- `prisma.ts` — exports a single `PrismaClient` instance. The generated client lives at `generated/prisma/` (not `@prisma/client`) because Prisma v7 uses a custom output path. Always import Prisma types from `../../generated/prisma/`.
- `langchain.ts` — exports a pre-configured `ChatOpenAI` instance (`gpt-4o-mini`). LangChain chains/agents should be built in `src/services/` and consume this singleton.

**Error handling:** throw an object satisfying `AppError` (from `src/middleware/errorHandler.ts`) with an optional `statusCode` field; the global handler in `src/index.ts` converts it to a JSON response. Use the `httpError(statusCode, message)` helper in `src/lib/httpError.ts`.

## Intent Drift AI pipeline

The Intent Drift feature uses **Claude Code headless (subscription)** as its AI engine — driven via `src/lib/claudeRunner.ts` (a port of `claude-headless-demo/`), **not** the LangChain/OpenAI singleton in `src/lib/langchain.ts` (currently unused). No Anthropic API key is needed; it reuses the local `claude` subscription login.

- **Prompts** live in `src/prompts/` — one file per pipeline step. All three are wired: `reverseSpec.ts` (step 1), `gapAnalysis.ts` (step 2), `questionGeneration.ts` (step 3).
- **Config** in `src/config/claude.ts` (model, budget cap, permission mode — env-overridable).
- **Step 1 flow:** `POST /api/v1/analyses { prUrl, projectId }` (or the stateless `reverseSpecController`) → `githubService.fetchPrDiff` (runs `gh pr diff`) → `reverseSpecService.generateReverseSpec` (hands the diff to Claude as text, parses JSON) → typed result + run metadata.
- **Steps 2+3 flow:** `POST /api/v1/compare-spec { reverseSpec, originalSpec | originalSpecs[] }` → `compareService.compareSpec` → `gapAnalysisService.generateGapAnalysis` (latest of any timestamped spec versions is authoritative; older ones are superseded) → `questionGenerationService.generateQuestions` (one question per gap, merged onto each gap with an empty `answer`) → frontend-ready `{ gaps: ResolvedGap[], meta }`. Stateless (no DB).
- **Gap taxonomy:** `missing_feature | deviation | undocumented_addition` — kept in sync across `gapAnalysis.ts` (`GAP_TYPES`), `types/intentDrift.ts`, and `frontend/src/lib/meta.jsx`.
- **Prereqs:** `gh` installed + authenticated (`gh auth login`/`GH_TOKEN`); a Claude subscription login present.
- **Fast tests (no HTTP):** `npm run test:reverse-spec -- <prNumber> [owner/repo]` (step 1); `npm run test:gap-questions` (steps 2+3, latest-spec prioritization + JSON Q&A).

## Environment Variables

**Never read `.env`** — it contains real secrets. Use `.env.example` as the reference for all required variables.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Required for all LangChain calls |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Controls Prisma query logging (`development` = verbose) |

## Custom Slash Commands

Defined in `.claude/commands/` — invoke with `/command-name [args]`:

| Command | Args | What it does |
|---|---|---|
| `/new-feature` | `<name>` | Scaffolds route + controller + service and registers the route |
| `/add-model` | `<name>` | Adds a Prisma model, runs migration, regenerates client |
| `/new-chain` | `<name>` | Creates a LangChain LCEL chain service in `src/services/` |
| `/db-migrate` | `<name>` | Formats schema, runs migration, regenerates client |
| `/typecheck` | — | Runs `tsc --noEmit` and fixes all type errors |
| `/push` | — | Stage → commit (conventional message) → merge dev → push branch |

## Key Constraints

- **CommonJS modules** — `tsconfig.json` targets `"module": "commonjs"`. Do not use top-level `await` at module scope outside of async functions.
- **Import paths** — even though the project is CommonJS, file imports in `src/` use `.js` extensions (e.g. `./routes/index.js`) because ts-node resolves them correctly at runtime.
- **Prisma client path** — import from `../../generated/prisma/index.js` (relative to `src/lib/`), not from `@prisma/client`.
