Add a new Prisma model for: $ARGUMENTS

Steps:
1. Add the model definition to `prisma/schema.prisma` with appropriate fields, types, and relations.
2. Run `npx prisma format` to auto-format the schema.
3. Run `npx prisma migrate dev --name add_$ARGUMENTS` to generate and apply the migration.
4. Run `npm run prisma:generate` to regenerate the client.

Rules:
- Always include `id`, `createdAt`, and `updatedAt` fields on every model.
- Use `@map` and `@@map` to keep database column/table names in snake_case while model names stay PascalCase.
- After migration, confirm the generated client is up to date by checking `generated/prisma/`.
- Show the final model definition after all steps complete.
