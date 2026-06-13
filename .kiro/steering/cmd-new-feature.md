---
inclusion: manual
---

# Command: new-feature

Scaffold a complete API feature for: **$ARGUMENTS**

Create the following files following the route → controller → service pattern:

## 1. `src/routes/$ARGUMENTS.ts`
Express Router that imports from the controller. Mount it in `src/routes/index.ts` under `/api/$ARGUMENTS`.

## 2. `src/controllers/$ARGUMENTS.controller.ts`
- Handles req/res, calls the service layer
- Throws `AppError` (from `src/middleware/errorHandler.ts`) on errors with an appropriate `statusCode`
- Add JSDoc to every function
- Add Swagger annotations to every route handler

## 3. `src/services/$ARGUMENTS.service.ts`
- Business logic only — no req/res objects
- Import `prisma` from `src/lib/prisma.ts` for DB access
- If this feature involves AI/LLM, import `chatModel` from `src/lib/langchain.ts`
- Add JSDoc to every function

## Rules
- No implicit `any` — all functions explicitly typed
- No inline `try/catch` unless re-throwing as `AppError`
- Export named functions, not default classes
- Use `.js` extensions on local imports (e.g. `./services/$ARGUMENTS.service.js`)
- After creating the files, confirm the route URL that was registered

## Domain reminder
Check `specs/CONTEXT.md` for the correct terminology for this feature's domain concepts.
