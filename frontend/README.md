# Intent Drift — Frontend

React (Vite) single-page app for **Intent Drift**, a governance portal that detects when
code diverges from its specification. This implements the design in the shared
`Intent Drift.dc.html` Claude Design file, on the Simform charcoal/coral design system.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
```

The login screen's "Continue with GitHub" is wired to a local demo login. Click it to
enter the app — everything runs on in-memory fixture data (no backend required).

## What's implemented

The complete frontend flow, pixel-faithful to the design:

- **Login gate** — GitHub-OAuth-only entry screen.
- **App shell** — charcoal sidebar (Projects · PR Analysis · Drift Reports · AI Insights ·
  Settings) + sticky header with breadcrumb + search.
- **Projects** — GitHub-synced repository list with per-repo analysis state.
- **Project detail** — Overview (stats + open PRs + recent analyses), Pull Requests table,
  Analyses & Reports list, Settings.
- **Analysis workspace** — every pipeline state: trigger form → `analyzing` →
  `ready` (reverse spec + optional spec input) → `comparing` → `questions_ready`
  (inline answering, submit gated on all-answered) → `completed`; plus `failed` and
  `stale` banners.
- **Drift Reports** — completed Decision Records (grid + detail view, Markdown download).
- **AI Insights** — cross-project drift aggregates.

## Architecture

```
src/
  App.jsx            single state store + router (auth / page / view / analyses)
  data/seed.js       fixture data — one export per future API response
  api/client.js      BACKEND CONTRACT: stubbed fetch() per endpoint (not yet wired)
  lib/
    Icon.jsx         Lucide thin-line icon set + spinner
    meta.jsx         palette, severity/type metadata, StatePill, GapChip
    derive.js        pure helpers (CTA styling, markdown export, etc.)
    Markdown.jsx     react-markdown renderer for AI free-form text
    Hov.jsx          inline hover-style helper
  pages/             one component per screen
  components/        Sidebar, Header
  styles/            tokens.css (design system), global.css
```

## Backend integration (TODO)

No backend calls are wired yet. `src/api/client.js` documents the exact contract for
every endpoint in `specs/SPEC.md §7` (auth, projects, pulls, analyses, answers, submit,
export). Search the codebase for `// BACKEND:` to find each integration point in the UI.
To go live:

1. Implement the `fetch()` calls in `src/api/client.js`.
2. Replace the fixture reads + reducer mutations in `App.jsx` with those calls,
   polling `getAnalysis()` while status is `analyzing` / `comparing`.
3. `vite.config.js` already proxies `/api` and `/auth` to the Node backend on `:3000`.

**AI output format:** the reverse spec is rendered as Markdown; gaps & questions remain
structured records with Markdown-capable text fields. See the "Markdown vs JSON outputs"
note in `specs/SPEC.md`.
