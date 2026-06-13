# Intent Drift

> A governance platform that detects when code diverges from its original specification, surfaces the gaps as targeted questions, and consolidates the team's answers into a single Decision Record.

A developer links their GitHub account, picks a repository and an open pull request, and triggers an **Analysis**. An AI pipeline reverse-engineers what the PR's code *actually does*, compares it against the team's *intended* specification, identifies the divergences ("gaps"), and turns each one into a specific, answerable question. The person who triggered the analysis answers the questions, then submits a **Decision Record** the whole team can read and download.

---

## How it works — the 3-step AI pipeline

The engine is **Claude Code running headless** (`claude --print`) against the local Claude **subscription** login — no Anthropic API key. The backend fetches all GitHub content itself and hands Claude plain text with **no tools**, which keeps each call cheap, deterministic, and trivially parseable.

```
        ┌─────────────────────────────────────────────────────────────┐
        │                      Intent Drift pipeline                    │
        └─────────────────────────────────────────────────────────────┘

 PR diff ──▶ ① Reverse Spec ──▶ what the code ACTUALLY does (Markdown)
                                          │
 original spec ──────────────────────────┤
                                          ▼
                          ② Gap Analysis ──▶ behavioural gaps (typed + severity)
                                          │
                                          ▼
                       ③ Question Generation ──▶ one question per gap
                                          │
                                          ▼
              Respondent answers ──▶ submit ──▶ Decision Record (Markdown)
```

| Step | Input | Output |
|------|-------|--------|
| **1 · Reverse Spec** | PR diff (no spec given) | Plain-language description of actual behaviour |
| **2 · Gap Analysis** | Reverse spec + original spec | List of gaps (`type`, `severity`, description) |
| **3 · Question Generation** | The gaps | One specific, answerable question per gap |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React (Vite SPA), `react-markdown` |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL via Prisma ORM |
| AI engine | Claude Code headless (subscription, `claude-sonnet-4-6`) |
| GitHub | OAuth login + Octokit REST (repos/PRs) + `gh` CLI (PR diff) |
| Storage | AWS S3 (spec/report file artifacts) |
| Auth | GitHub OAuth → JWT Bearer |

---

## Repository layout

```
the-token-burners/
├── backend/              Express + TypeScript API  ──▶ see backend/README.md
│   ├── src/              Route → Controller → Service code
│   │   ├── FLOW.md       (in backend/) end-to-end request & pipeline flow
│   │   └── MODULE.md     (in backend/) what every module does
│   └── prisma/           schema + migrations
├── frontend/             React (Vite) single-page app
├── specs/                SPEC.md, CONTEXT.md, BACKEND_PLAN.md — source of truth
└── claude-headless-demo/ the R&D demo that proved headless Claude works
```

Deeper backend docs: [`backend/README.md`](backend/README.md) · [`backend/FLOW.md`](backend/FLOW.md) · [`backend/MODULE.md`](backend/MODULE.md)
Product spec: [`specs/SPEC.md`](specs/SPEC.md) · Glossary: [`specs/CONTEXT.md`](specs/CONTEXT.md)

---

## Quickstart

### Prerequisites
- Node.js v18+
- Docker (for local PostgreSQL) — or any reachable Postgres
- The `gh` CLI, authenticated (`gh auth login`) — used to fetch PR diffs
- A logged-in Claude Code subscription on the machine (`claude` in PATH)
- AWS S3 credentials and a GitHub OAuth app (client id/secret)

### Backend

```bash
cd backend
cp .env.example .env          # fill in DB, AWS, GitHub OAuth, JWT values
docker compose up -d          # start PostgreSQL
npm install
npm run prisma:migrate        # create schema + generate Prisma client
npm run dev                   # http://localhost:3000  (Swagger at /api-docs)
```

### Frontend

```bash
cd frontend
npm install
npm run dev                   # Vite dev server; proxies /api and /auth to :3000
```

---

## API at a glance

Base path: **`/api/v1`** · Auth: **`Authorization: Bearer <jwt>`** (from GitHub OAuth) · Swagger UI: **`/api-docs`**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET`  | `/auth/github` · `/auth/github/callback` | GitHub OAuth → returns a JWT |
| `GET`  | `/projects` | List the user's synced repositories |
| `POST` | `/projects/sync` | Re-sync repos from GitHub |
| `GET`  | `/projects/:id/pulls` | List open PRs (live from GitHub) |
| `POST` | `/analyses` | Trigger an analysis (async; returns `{ analysis_id }`) |
| `GET`  | `/analyses/:id` | Poll status + reverse spec + gaps + questions |
| `PATCH`| `/analyses/:id/spec` | Provide the original spec → run gap analysis |
| `PATCH`| `/analyses/:id/answers` | Save one answer (Respondent only) |
| `POST` | `/analyses/:id/submit` | Submit once every question is answered |
| `GET`  | `/analyses/:id/export` | Download the Decision Record as Markdown |
| `POST` | `/analyses/:id/retrigger` | Re-run on the latest commit |
| `POST` | `/compare-spec` | Stateless steps 2+3 (no DB) — gaps + questions |

See [`backend/FLOW.md`](backend/FLOW.md) for the full request lifecycle and status state machine.
