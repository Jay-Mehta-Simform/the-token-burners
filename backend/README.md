# Backend — Intent Drift

The Express + TypeScript API for Intent Drift. Fetches GitHub PR diffs, runs the 3-step Claude pipeline (reverse spec → gap analysis → questions), and persists analyses to PostgreSQL.

- **Code flow:** [`FLOW.md`](FLOW.md) — request lifecycle, pipeline, status state machine
- **Module reference:** [`MODULE.md`](MODULE.md) — what every file does
- **Product spec:** [`../specs/SPEC.md`](../specs/SPEC.md)

## Tech stack
- **Node.js + Express + TypeScript** (CommonJS; `.js` import extensions)
- **Prisma ORM** → PostgreSQL (pg pool + `@prisma/adapter-pg`)
- **Claude Code headless** (subscription) as the AI engine — no Anthropic API key
- **Octokit + `gh` CLI** for GitHub; **AWS S3** for file artifacts
- **GitHub OAuth → JWT** auth; **Swagger** at `/api-docs`

## Prerequisites
- Node.js v18+
- Docker + Docker Compose (for local PostgreSQL)
- `gh` CLI authenticated (`gh auth login`) — used to fetch PR diffs
- A logged-in Claude Code subscription (`claude` in PATH)
- AWS S3 credentials + a GitHub OAuth app (client id/secret)

## Setup

```bash
# 1. Environment — copy and fill in DB, AWS, GitHub OAuth, JWT values
cp .env.example .env

# 2. Start PostgreSQL
docker compose up -d

# 3. Install dependencies
npm install

# 4. Run migrations + generate the Prisma client
npm run prisma:migrate

# 5. Start the dev server (nodemon + tsx, hot reload)
npm run dev
```

Server runs on `http://localhost:3000`. Swagger UI: `http://localhost:3000/api-docs`. API base path: `/api/v1`.

## Scripts

| Script | What it does |
|--------|--------------|
| `npm run dev` | Hot-reload dev server (nodemon + tsx) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm run prisma:generate` | Regenerate the Prisma client after schema changes |
| `npm run prisma:migrate` | Create + apply a migration (dev) |
| `npm run test:reverse-spec -- <PR-url>` | Run step 1 directly against a PR (no HTTP) |
| `npm run test:gap-questions` | Run steps 2+3 directly (no HTTP) |

## API surface

Auth: `Authorization: Bearer <jwt>` (obtained from the GitHub OAuth flow).

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/auth/github` · `/auth/github/callback` | GitHub OAuth → JWT |
| `GET`  | `/projects` · `POST /projects/sync` · `GET /projects/:id/pulls` | Repos & PRs |
| `POST` | `/analyses` | Trigger analysis (async → `{ analysis_id }`) |
| `GET`  | `/analyses/:id` | Poll status + reverse spec + gaps + questions |
| `PATCH`| `/analyses/:id/spec` | Provide spec → gap analysis + questions |
| `PATCH`| `/analyses/:id/answers` · `POST /analyses/:id/submit` | Answer & submit (Respondent) |
| `GET`  | `/analyses/:id/export` | Decision Record as Markdown |
| `POST` | `/analyses/:id/retrigger` | Re-run on latest commit |
| `POST` | `/compare-spec` | Stateless steps 2+3 (no auth, no DB) |
| `POST` | `/files/presigned-url` · `POST /files/register` | S3 upload helpers |

See [`FLOW.md`](FLOW.md) for the full request and pipeline flow.

## Notes
- The `generated/` folder (Prisma client) is environment-specific — regenerate with `npm run prisma:generate` after any `schema.prisma` change.
- **Never commit or read `.env`** — it holds real secrets. Use `.env.example` as the reference.
- The AI pipeline uses Claude headless, not the `langchain.ts`/OpenAI singleton (which is currently unused).
