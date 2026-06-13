Create a new LangChain chain or agent service for: $ARGUMENTS

Create `src/services/$ARGUMENTS.chain.ts` with the following structure:

1. Import `chatModel` from `src/lib/langchain.ts` — do NOT instantiate a new ChatOpenAI.
2. Build the chain using LangChain Expression Language (LCEL) with the pipe operator (`|`).
3. Use `ChatPromptTemplate.fromMessages` for prompt construction.
4. Export a typed async function (e.g. `run$ARGUMENTSChain`) that accepts input and returns a typed result.
5. If the chain needs to persist context or results, import `prisma` from `src/lib/prisma.ts`.

After creating the service, wire it into the appropriate controller in `src/controllers/` or indicate which controller should call it.

Show the full chain definition and the expected input/output types.
