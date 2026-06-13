---
inclusion: manual
---

# Command: push

Execute the full git push workflow for the current branch.

Follow these steps in order. Stop and report if any step fails — do not continue past a failure.

---

## Step 1 — Stage all changes

Run `git add .` and show a summary using `git status`.

---

## Step 2 — Commit with a meaningful message

Run `git diff --cached` to understand exactly what changed.

Write a commit message that:
- Uses conventional commit format: `type(scope): short description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `perf`
- Subject line is max 72 characters, imperative mood ("add" not "added")
- Includes a short body if the change is non-trivial, explaining the *why*

```
git commit -m "<subject>" -m "<body if needed>"
```

---

## Step 3 — Pull latest and merge

Capture the current branch:
```
git branch --show-current
```

Pull and merge from main/develop:
```
git fetch origin develop
git merge origin/develop
```

If there are merge conflicts:
- List every conflicting file
- Resolve each conflict (prefer current branch's intent for feature code, dev's version for shared config)
- Stage resolved files and run `git merge --continue`

---

## Step 4 — Push the branch

```
git push origin <current-branch>
```

If no upstream exists yet:
```
git push --set-upstream origin <current-branch>
```

---

## Final report

Show:
- Commit hash and message
- Whether a merge from develop occurred and if conflicts were resolved
- The remote URL the branch was pushed to
