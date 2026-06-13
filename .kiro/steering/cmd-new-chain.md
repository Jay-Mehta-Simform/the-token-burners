---
inclusion: manual
---

# Command: new-chain

Create a new LangChain chain service for: **$ARGUMENTS**

Create `src/services/$ARGUMENTS.chain.ts` with the following structure:

## Requirements

1. Import `chatModel` from `src/lib/langchain.ts` — do NOT instantiate a new `ChatOpenAI`.
2. Build the chain using LangChain Expression Language (LCEL) with the pipe operator (`|`).
3. Use `ChatPromptTemplate.fromMessages` for prompt construction.
4. Export a typed async function (e.g. `run$ARGUMENTSChain`) that accepts typed input and returns a typed result.
5. If the chain needs to persist context or results, import `prisma` from `src/lib/prisma.ts`.
6. Add JSDoc to every exported function.

## AI Pipeline context
This project uses a 3-step pipeline (see `specs/SPEC.md` §5):
- **Step 1** — Reverse Spec Generation (no original spec in context)
- **Step 2** — Gap Analysis (reverse spec + original spec → structured gaps)
- **Step 3** — Question Generation (gaps → structured questions)

Steps 2 and 3 must use structured output (tool use) so responses parse reliably.

## After creating the service
Wire it into the appropriate controller in `src/controllers/` or indicate which controller should call it. Show the full chain definition and the expected input/output types.
