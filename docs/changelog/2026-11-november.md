# HelloRun Changelog — November 2026

## November 4 — restrained motion and validation feedback

- Added shared 120ms, 180ms, and 240ms motion tokens, explicit property transitions,
  press feedback, and reduced-motion fallbacks across navigation, landing, event,
  leaderboard, registration, authentication, proof, and runner-dashboard surfaces.
- Preserved progressive navigation, server-rendered filtering and rankings, proof draft
  and submission authority, duplicate-submit guards, dashboard focus, disclosures,
  history, polling, and scroll position.
- Added accessible invalid-field associations and first-invalid focus. Dashboard refreshes
  now expose busy state, skip unchanged fragments, and animate only changed markup.
- Added focused motion regressions. Required syntax, format, whitespace, focused, and full
  DB-free unit checks pass. No deployment or production-like database suite ran.
