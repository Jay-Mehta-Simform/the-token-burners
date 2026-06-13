Execute the full git push workflow for the current branch.

Follow these steps in order. Stop and report if any step fails — do not continue past a failure.

---

**Step 1 — Stage all changes**

Run `git add .`

Show a summary of what was staged using `git status`.

---

**Step 2 — Commit with a meaningful message**

Run `git diff --cached` to understand exactly what changed.

Write a commit message that:
- Uses conventional commit format: `type(scope): short description`
- Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `perf`
- Subject line is max 72 characters, imperative mood ("add" not "added")
- Includes a short body if the change is non-trivial, explaining the *why*

Run:
```
git commit -m "<subject>" -m "<body if needed>"
```

---

**Step 3 — Pull latest dev and merge into current branch**

First capture the current branch name:
```
git branch --show-current
```

Then pull and merge from dev:
```
git fetch origin dev
git merge origin/dev
```

If there are merge conflicts:
- List every conflicting file
- Resolve each conflict, preferring the current branch's intent for feature code and dev's version for shared config/infra files
- Stage the resolved files and run `git merge --continue`

---

**Step 4 — Push the branch**

```
git push origin <current-branch>
```

If the branch has no upstream yet, run:
```
git push --set-upstream origin <current-branch>
```

---

**Final report**

Show:
- Commit hash and message
- Whether a merge from dev occurred and if conflicts were resolved
- The remote URL the branch was pushed to
