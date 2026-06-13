Run a full TypeScript type check across the project without emitting output.

Execute: `npx tsc --noEmit`

If there are errors:
- List each error with its file path and line number.
- Group errors by file.
- Fix all errors, prioritizing type mismatches over missing types.

Do not use `any` as a fix — use proper types or `unknown` with a type guard.
