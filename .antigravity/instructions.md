# Antigravity General Instructions

You are working on the "Token Burners" hackathon project. Follow these guidelines to ensure consistency and high-quality code.

## Project Structure
The backend follows a **Route -> Controller -> Service** pattern:
- **Routes (`src/routes/`)**: Define API endpoints and associate them with controller methods.
- **Controllers (`src/controllers/`)**: Handle HTTP requests/responses, validate input, and call services. Use `AppError` for error handling.
- **Services (`src/services/`)**: Contain business logic and interact with the database via Prisma.
- **Database (`prisma/`)**: Schema definitions and migrations.

## Coding Standards
- **Explicit Typing**: Avoid `any`. Use TypeScript interfaces and types for all data structures.
- **Named Exports**: Prefer named exports over default exports for better discoverability and refactoring.
- **Error Handling**: Use the centralized error handler. Throw `AppError` with appropriate HTTP status codes.
- **Prisma**: Use the shared prisma client from `src/lib/prisma.ts`.
- **Documentation**: 
    - Always add **JSDoc** for every internal function.
    - Always add **Swagger documentation** for every API route.

## Session Management
- **Session End**: Before ending a session, document the session flow, progress, and pending tasks in the `session_flow.md` file located in the root of the project you are working on (e.g., `backend/session_flow.md`). Create the file if it doesn't exist.

## AI & LLM Tools
- If a feature involves AI or LLMs, use the patterns established in `src/lib/langchain.ts`.

## Deployment & DevOps
- Use Docker for local development (`docker-compose.yml`).
- Environments are managed via `.env` files. Ensure `.env.example` is updated when new variables are added.
