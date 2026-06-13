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

**Error handling:** throw an object satisfying `AppError` (from `src/middleware/errorHandler.ts`) with an optional `statusCode` field; the global handler in `src/index.ts` converts it to a JSON response.

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
