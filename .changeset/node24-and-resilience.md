---
"@tmcw/notfoundbot": minor
---

Bump the action runtime to Node 24 and harden the run loop:

- `action.yml` now uses `node24` (Node 20 is being deprecated by GitHub Actions on June 2, 2026)
- Wayback Machine 5xx / non-JSON responses no longer crash the run; the failure is logged and the run continues with whatever upgrades it already found
- The action entrypoint now catches stray errors and unhandled rejections instead of exiting silently
- Upgraded all direct dependencies to latest, including `@actions/cache` v6, `@actions/core` v3, `@actions/github` v9, and `typescript` v6
- Replaced the broken npm-publish release flow with `changeset tag` so the release workflow creates GitHub releases + git tags only (no npm publish, which never had credentials configured)
- Added a `verify-dist` CI job so PRs that forget to commit `dist/` fail loudly
