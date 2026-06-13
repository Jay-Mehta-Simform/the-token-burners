# Intent Drift — Build Specification

> A governance platform that detects when code diverges from its original specification, surfaces the gaps as targeted questions, and consolidates the team's answers into a single decision record.

This document is the implementation spec for the MVP. It is intended to be fed to an AI coding agent (Claude Code) to build the project. All decisions below are final for the hackathon scope.

---

## 1. Product summary

A developer links their GitHub account to the Intent Drift portal. They see all their repositories ("Projects"). Inside a project, they see the open pull requests. On any PR, they can trigger an **Analysis**: the system fetches the changed files, the user provides the original spec, and an AI pipeline reverse-engineers what the code does, compares it to the spec, identifies gaps, and generates questions. The person who triggered the analysis answers each question, then submits a final **Decision Record** that the whole team can view and download.

---

## 2. Tech stack

| Layer              | Choice                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Frontend           | React (single-page application)                                                                     |
| Backend            | Node.js                                                                                             |
| Database           | PostgreSQL (persist everything)                                                                     |
| LLM provider       | Claude Code headless (subscription, `claude-sonnet-4-6`) — driven via `claude -p` stdin, no API key |
| Auth               | GitHub OAuth (only login method)                                                                    |
| GitHub integration | `gh` CLI (`gh pr diff`) — authenticated via `gh auth login` or `GH_TOKEN`                           |
| Pipeline execution | Async on backend; frontend polls for status                                                         |

---

## 3. Core domain concepts

(See `CONTEXT.md` for the canonical glossary. Summarised here for build context.)

- **Project** — a GitHub repository, one-to-one. Synced from GitHub.
- **Analysis** — one run of the AI pipeline on a PR. States: `analyzing → ready → completed | failed`.
- **Spec (Original Specification)** — human-authored intended behaviour, provided by the user at trigger time (paste or upload).
- **Code Input** — the unified diff of all files changed in the PR, fetched by the backend via `gh pr diff`. The user provides only the PR link; the backend resolves the diff automatically.
- **Reverse Spec** — AI-generated plain-language description of what the code actually does, inferred from implementation alone.
- **Gap** — a divergence between Spec and Reverse Spec. Classified by `type` (missing feature | deviation | undocumented addition) and `severity`.
- **Question** — AI-generated, answerable prompt attached to a Gap.
- **Respondent** — the single person who triggered the Analysis; the only one who can answer questions.
- **Decision Record** — the output of a completed Analysis: all Gaps + Questions + answers. Viewable by all repo members, downloadable as Markdown.

---

## 4. User flow

1. **Login** — user authenticates via GitHub OAuth. No email/password.
2. **Project list** — all repositories the user has GitHub access to appear automatically as Projects.
3. **PR list** — inside a Project, the user sees open pull requests for that repo.
4. **Trigger Analysis** — on a PR, the user clicks "Analyze", pastes or uploads the original Spec, and confirms.
    - The user provides the PR link (e.g. `https://github.com/owner/repo/pull/123`). The backend parses the link and fetches the PR diff via `gh pr diff` — no manual file pasting required.
    - Backend locks the PR (first-write-wins). If an Analysis is already `analyzing`, the trigger is rejected with "Analysis already in progress".
    - The triggering user becomes the **Respondent**.
5. **Analyzing** — backend fetches the PR diff via `gh pr diff` and runs the 3-step pipeline. Frontend polls for status.
6. **Ready** — gaps and questions are displayed. Respondent answers each question inline.
7. **Submit** — submit button is enabled only when every question has an answer. On submit, Analysis → `completed`.
8. **Decision Record** — on-screen summary view + Markdown download. Visible to all repo members (read-only for non-Respondents).

### Edge cases

- **Re-trigger:** Only one active Analysis per PR. Manually re-triggering replaces the previous one and resets all answers.
- **Stale:** If new commits are pushed after an Analysis is `ready` or `completed`, show a stale warning banner. Do not auto re-trigger.
- **Failure:** If any LLM call fails, Analysis → `failed`. Show an error state with a retry option (never an infinite spinner).
- **Concurrency:** First trigger wins; PR unlocks on `ready`, `completed`, or `failed`.

---

## 5. AI pipeline

Three sequential Claude Code headless calls, server-side. The backend fetches all GitHub content itself and passes it as plain text to Claude via stdin (`tools: []`). No Anthropic API key required — uses the Claude subscription login. Structured output is achieved via JSON-only prompts + backend parse/validate.

### Step 1 — Reverse Spec Generation

- **Input:** the PR diff (fetched by backend via `gh pr diff`; passed as text — Claude does not call any tools).
- **Instruction:** describe what the code actually does in plain language, inferring behaviour purely from implementation. The model must NOT be given the original Spec at this step.
- **Output:** plain-language reverse specification, formatted as **Markdown** (see "Markdown vs JSON outputs" below). Stored verbatim in `analyses.reverse_spec`.

### Step 2 — Gap Analysis

- **Input:** the Reverse Spec (from step 1) + the original Spec (from the user).
- **Instruction:** compare them and return a list of gaps.
- **Output (structured):** array of gaps, each:
    ```json
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "type": "missing_feature | deviation | undocumented_addition",
      "severity": "low | medium | high"
    }
    ```

### Step 3 — Question Generation

- **Input:** the list of gaps from step 2.
- **Instruction:** for each gap, generate one or more specific, answerable questions (not vague flags).
- **Output (structured):** array of questions, each:
    ```json
    {
      "id": "string",
      "gap_id": "string",
      "text": "string"
    }
    ```

---

### Markdown vs JSON outputs (frontend rendering decision)

The MVP renders **AI free-form text as Markdown** rather than treating it as an opaque string:

- **Reverse Spec (Step 1):** the model returns Markdown (headings, bold, inline `code`, lists). `reverse_spec` is stored as a raw Markdown string and rendered with `react-markdown` (`remark-gfm`) inside the dark "reverse spec" terminal panel on the frontend. The backend does **not** need to wrap it in JSON — a plain Markdown string in the field is sufficient.
- **Gaps (Step 2) & Questions (Step 3):** these stay **structured JSON** as defined below. The UI fundamentally depends on the per-gap `type`/`severity` classification and per-question inline answering (severity chips, type marks, answer textareas, submit gating), so they cannot collapse into a single Markdown blob. Their free-text fields (`gaps.description`, `questions.text`, `gaps.answer`) MAY contain inline Markdown and are rendered through the same Markdown renderer.

In short: **Step 1 → Markdown string; Steps 2 & 3 → structured records whose text fields are Markdown-capable.** The frontend (`frontend/src/lib/Markdown.jsx`) is the single rendering point.

## 6. Data model (PostgreSQL)

```
users
  id              PK
  github_id       unique
  github_login
  oauth_token     (encrypted)
  created_at

projects
  id              PK
  github_repo_id  unique
  owner           (repo owner login)
  name            (repo name)
  user_id         FK -> users        (who linked it)
  created_at

analyses
  id              PK
  project_id      FK -> projects
  pr_number       int
  pr_head_sha     (commit SHA at trigger time — used for stale detection)
  respondent_id   FK -> users        (the triggering user)
  original_spec   text
  reverse_spec    text                (filled after step 1)
  status          enum: analyzing | ready | completed | failed
  is_stale        boolean default false
  error_message   text nullable
  created_at
  completed_at    nullable

gaps
  id              PK
  analysis_id     FK -> analyses
  title
  description
  type            enum: missing_feature | deviation | undocumented_addition
  severity        enum: low | medium | high

questions
  id              PK
  gap_id          FK -> gaps
  text
  answer          text nullable       (filled by respondent)
```

> A "Decision Record" is not a separate table — it is the rendered view/export of a `completed` analysis joined with its gaps, questions, and answers.

---

## 7. API surface (backend)

| Method | Endpoint                    | Purpose                                                                                                                                                                                     |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/auth/github`              | Begin GitHub OAuth                                                                                                                                                                          |
| GET    | `/auth/github/callback`     | OAuth callback; create/lookup user, store token                                                                                                                                             |
| GET    | `/api/projects`             | List repos the user has access to                                                                                                                                                           |
| GET    | `/api/projects/:id/pulls`   | List open PRs for a repo                                                                                                                                                                    |
| POST   | `/api/analyses`             | Trigger Analysis. Body: `{ pr_url, original_spec }` — backend parses `pr_url` to extract owner/repo/PR number and fetches the diff. Locks PR (first-write-wins). Returns `{ analysis_id }`. |
| GET    | `/api/analyses/:id`         | Poll Analysis status + gaps + questions + answers                                                                                                                                           |
| PATCH  | `/api/analyses/:id/answers` | Save answer(s). Body: `{ question_id, answer }`                                                                                                                                             |
| POST   | `/api/analyses/:id/submit`  | Submit. Rejected unless all questions answered. Sets `completed`.                                                                                                                           |
| GET    | `/api/analyses/:id/export`  | Download Decision Record as Markdown                                                                                                                                                        |

---

## 8. MVP scope (build and demo)

- GitHub OAuth login
- Project (repo) list
- PR list per project
- Trigger Analysis with PR link + manual Spec input (paste/upload)
- Fetch PR diff via `gh pr diff` (backend-side; user provides only the PR URL)
- 3-step AI pipeline (reverse spec → gap analysis → questions)
- Async execution with frontend polling, including `failed` state handling
- Gap report view (gaps grouped, classified by type + severity)
- Inline question-answering for the Respondent
- Explicit submit gated on all questions answered
- Decision Record: on-screen view (visible to all repo members) + Markdown download
- Stale-analysis warning banner

## 9. Out of scope (future)

- Decision Note Synthesis (AI consolidation of answers into a summary)
- PDF export
- Routing questions to specific stakeholder teams
- Persistent cross-review history / multiple analyses per PR
- Third-party integrations (Jira, Linear, Confluence)
- Automated ticket creation
- Portal-level role-based access (beyond GitHub permissions)
- Multi-repo project grouping
- Webhook-driven automatic analysis

---

## 10. Build notes

- Encrypt OAuth tokens at rest.
- All three LLM calls run server-side via **Claude Code headless** (`claude -p` subscription) — no Anthropic API key; never expose any credentials to the frontend.
- The backend fetches the PR diff itself (`gh pr diff`) and passes it as text to Claude via stdin. Claude runs with `tools: []` — it never accesses GitHub directly.
- Use JSON-only prompts + backend parse/validate for structured output (steps 1, 2, 3). No Claude tool use needed.
- Stale detection: compare current PR head SHA (from GitHub) against `analyses.pr_head_sha`.
- Keep `CONTEXT.md` as the source of truth for domain terminology.
