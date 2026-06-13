---
inclusion: manual
---

# Command: handoff

Compact the current conversation into a handoff document so a fresh agent session can continue the work.

## Output

Save the document to the OS temp directory (e.g. `/tmp/intent-drift-handoff-<date>.md`), then show the path.

## Document structure

```
# Intent Drift — Agent Handoff

**Date:** <ISO date>
**Focus for next session:** <from arguments, or inferred from conversation>

## What was accomplished
<bullet list — reference commit SHAs, file paths, or spec sections instead of duplicating content>

## Current state
<what is working, what is partially done, what is broken>

## Pending tasks
<ordered list of what to do next, with enough context to pick up cold>

## Relevant files
<list of files touched or relevant to next session>

## Suggested steering files to activate
<list relevant .kiro/steering/ files for next session context>

## Blockers / open questions
<anything unresolved that needs a decision>
```

## Rules
- Do not duplicate content already in commits, specs, or session_flow.md — reference them by path.
- Redact any secrets, API keys, or tokens.
- If arguments were passed, treat them as the focus for the next session and tailor accordingly.
