Run database migrations for this project.

Execute the following steps in order:

1. Run `npx prisma format` to validate and format `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name $ARGUMENTS` to generate and apply the migration.
3. Run `npm run prisma:generate` to regenerate the Prisma client at `generated/prisma/`.
4. Confirm the migration was applied by listing the latest entry in `prisma/migrations/`.

If $ARGUMENTS is empty, use the name `update_schema`.

After completion, show:
- The migration file name that was created.
- Any new or changed models detected in the schema.
