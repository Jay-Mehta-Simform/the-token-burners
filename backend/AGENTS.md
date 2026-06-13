# Commands

```
npm run dev             # Start dev server (nodemon + ts-node, hot reload)
npm run build           # tsc compile to dist/
npm start               # Run compiled output
npm run prisma:generate # Regenerate Prisma client after schema changes
npm run prisma:migrate  # Create + apply Prisma migrations
npx prisma studio       # Open Prisma GUI
```

After any `prisma/schema.prisma` change, run `npm run prisma:generate` before starting the app.

# Architecture

**Entry point:** `src/index.ts` — Express app, mounts all routes under `/api`, attaches global error handler last.

**Route → Controller → Service pattern:**
- `src/routes/` — express Router definitions only
- `src/controllers/` — request/response handling, validation
- `src/services/` — business logic, DB calls, LangChain chains

**Shared singletons (`src/lib/`):**
- `prisma.ts` — single `PrismaClient`. The generated client lives at `generated/prisma/` (not `@prisma/client`). Import Prisma types from `../../generated/prisma/index.js`.
- `langchain.ts` — pre-configured `ChatOpenAI` (`gpt-4o-mini`). Build LangChain chains/agents in `src/services/` and use this singleton.

**Error handling:** throw an object matching `AppError` (`src/middleware/errorHandler.ts`) with optional `statusCode`; the global handler converts it to a JSON response.

# Constraints

- **CommonJS** — `tsconfig.json` targets `"module": "commonjs"`. No top-level `await` outside async functions.
- **`.js` imports** — even though this is CommonJS, all local imports in `src/` use `.js` extensions (e.g. `./routes/index.js`).
- **Never read `.env`** — contains real secrets. Use `.env.example` as the reference.

# Environment

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | Required for LangChain |
| `PORT` | Server port (default 3000) |
| `NODE_ENV` | Controls Prisma logging (`development` = verbose) |
