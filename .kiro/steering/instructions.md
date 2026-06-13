---
inclusion: always
---

# Intent Drift — Kiro Instructions

## Project Overview

**Intent Drift** is a governance platform that detects when code diverges from its original specification. It surfaces gaps as AI-generated questions, and consolidates answers into a Decision Record.

- **Backend:** Node.js + Express + TypeScript + Prisma (PostgreSQL) + LangChain (`gpt-4o-mini` → swap to `claude-sonnet-4-6` for the AI pipeline)
- **Frontend:** React SPA
- **Auth:** GitHub OAuth only
- **AI Pipeline:** 3-step sequential LangChain/Anthropic calls: Reverse Spec → Gap Analysis → Question Generation

Canonical domain glossary lives in `specs/CONTEXT.md`. Always use the terms defined there — Project, Analysis, Gap, Question, Respondent, Decision Record, etc.

---

## Coding Standards

### Documentation
- Add **JSDoc** to every internal function — parameters, return type, and a one-line description minimum.
- Add **Swagger/OpenAPI** annotations to every Express route handler.

### TypeScript
- No implicit `any`. Use `unknown` + type guards where the type is genuinely unknown.
- No inline `try/catch` unless re-throwing as `AppError` with a `statusCode`.
- Export named functions, not default classes.
- All functions must be explicitly typed.

### Architecture — Route → Controller → Service
- `src/routes/` — Express Router only, no business logic.
- `src/controllers/` — req/res handling, input validation, throw `AppError` on errors.
- `src/services/` — business logic, DB calls, LangChain interactions.
- `src/lib/prisma.ts` — single `PrismaClient` instance. **Always import from `../../generated/prisma/index.js`**, never from `@prisma/client`.
- `src/lib/langchain.ts` — pre-configured `ChatOpenAI` singleton. Never instantiate a new one.

### Prisma Models
- Always include `id`, `createdAt`, and `updatedAt` on every model.
- Use `@map` / `@@map` for snake_case DB names while keeping PascalCase model names.
- After any schema change, run `npm run prisma:generate` before running the app.

### CommonJS / Import Rules
- `tsconfig.json` targets `"module": "commonjs"`. No top-level `await` outside async functions.
- File imports in `src/` use `.js` extensions (ts-node resolves them at runtime).

### Error Handling
- Throw `AppError` (from `src/middleware/errorHandler.ts`) with an appropriate `statusCode`.
- Global handler in `src/index.ts` converts it to a JSON response.

---

## Environment Variables

Never read `.env` — it contains real secrets. Reference `.env.example` instead.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Required for all LangChain calls |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | Controls Prisma query logging |

---

## Key Commands

```bash
npm run dev              # Start with hot reload (nodemon + ts-node)
npm run build            # Compile TypeScript to dist/
npm start                # Run compiled output
npm run prisma:generate  # Regenerate client after schema changes
npm run prisma:migrate   # Run migrations
npx prisma studio        # Open Prisma GUI
npx tsc --noEmit         # Type-check without emitting
```

---

## Session Management

Before ending a session, document the session flow, progress, and pending tasks in `backend/session_flow.md`. Create the file if it doesn't exist.
