---
inclusion: manual
---

# Command: review

Two-axis review of the diff between `HEAD` and a fixed point.

## Axes
- **Standards** — does the code follow this repo's documented coding standards?
- **Spec** — does the code faithfully implement the Intent Drift spec (`specs/SPEC.md`)?

---

## Process

### 1. Pin the fixed point
Use what was provided — a commit SHA, branch name, tag, `main`, `HEAD~N`. If not specified, ask before proceeding.

Diff command: `git diff <fixed-point>...HEAD`
Commit list: `git log <fixed-point>..HEAD --oneline`

### 2. Standards sources for this repo
- `.kiro/steering/instructions.md`
- `backend/CLAUDE.md`
- `specs/CONTEXT.md` (domain terminology)
- `tsconfig.json`, `.eslintrc*` (machine-enforced — note but don't re-check)

### 3. Spec source
`specs/SPEC.md` — the Intent Drift MVP build specification.

### 4. Run both reviews in parallel sub-agents

**Standards sub-agent brief:** Read the standards docs, then the diff. Report every place the diff violates a documented standard. Cite the standard (file + rule). Distinguish hard violations from judgement calls. Skip anything tooling enforces. Under 400 words.

**Spec sub-agent brief:** Read `specs/SPEC.md`, then the diff. Report: (a) requirements missing or partial; (b) scope creep; (c) requirements that look implemented but are wrong. Quote the spec line for each finding. Under 400 words.

### 5. Aggregate

Present as:

```
## Standards
<sub-agent output>

## Spec
<sub-agent output>

---
Summary: X Standards findings, Y Spec findings. Worst issue: <one line>.
```
