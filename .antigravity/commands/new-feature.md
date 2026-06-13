Scaffold a complete API feature for: $ARGUMENTS

Create the following files following the project's route → controller → service pattern:

1. `src/routes/$ARGUMENTS.ts` — Express Router that imports from the controller. Mount it in `src/routes/index.ts` under `/api/$ARGUMENTS`.

2. `src/controllers/$ARGUMENTS.controller.ts` — Handles req/res, calls the service, throws `AppError` (from `src/middleware/errorHandler.ts`) on errors with an appropriate `statusCode`.

3. `src/services/$ARGUMENTS.service.ts` — Business logic. Import `prisma` from `src/lib/prisma.ts` for DB access. If this feature involves AI/LLM, import `chatModel` from `src/lib/langchain.ts`.

Rules:
- No inline try/catch unless re-throwing as AppError with a statusCode.
- All functions must be explicitly typed — no implicit `any`.
- Export named functions, not default classes.
- After creating the files, show the route URL that was registered.
