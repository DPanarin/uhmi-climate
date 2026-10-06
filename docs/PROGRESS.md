# Progress log

Plan: `docs/DEV_PLAN.md`. Update this file at every checkpoint.

## Status

| Phase | Checkpoint | Status | Date |
| --- | --- | --- | --- |
| P0. Project setup | CP0 | in progress | 2026-10-06 |
| P1. Data extraction | CP1 | not started | |
| P2. Map data build | CP2 | not started | |
| P3. App shell | CP3 | not started | |
| P4. Map | CP3 | not started | |
| P5. Controls modal | CP4 | not started | |
| P6. Charts and API client | CP5 | not started | |
| P7. Responsive and accessibility | CP6 | not started | |
| P8. Performance | CP6 | not started | |
| P9. Unit tests and data parity | CP6 | not started | |
| P10. Presentation package (Ukrainian) | CP7 | not started | |

## Decisions taken during implementation

_(date — decision — reason)_

- 2026-10-06 — Repo `DPanarin/uhmi-climate` (personal account, public); Pages at https://dpanarin.github.io/uhmi-climate/ — user's choice.
- 2026-10-06 — Repo root is `~/WebstormProjects/uhmi/climate` itself (the clone made in `climate/uhmi-climate` was moved up) — matches the plan's layout.
- 2026-10-06 — Claude only commits; the user pushes and deploys. Remote switched to HTTPS (plain SSH here logs in as PanarinD, not the personal account) — user's choice.
- 2026-10-06 — The user runs the dev server in WebStorm; Claude checks pages in the user's real Chrome — user's choice.
- 2026-10-06 — Current create-vue versions instead of the plan's: Vite 8 (plan: 6), MapLibre GL 6 (plan: 5), Pinia 4, vue-router 5, TS 6 — latest stable, no feature impact expected.
- 2026-10-06 — Dev URL includes the Pages base: http://localhost:5173/uhmi-climate/ — `base` in `vite.config.ts`.
- 2026-10-06 — Global npm 10.9 crashes on install; installs run via `npx npm@11` — npm bug, not project-specific.

## Open issues

- Legend scale: keep 1:1 or also show an alternative?
- Data owner's review of the extracted values after returning from leave.
- `npm audit`: 12 advisories (10 high), all in mapshaper's dev-only dependency tree (image-size, file-type); not shipped to the browser. Revisit if a mapshaper fix lands.

## Log

_(date — phase — what was done)_

- 2026-10-06 — P0 — Scaffold (TS, Pinia, Router, Vitest, ESLint + Prettier, no E2E), project deps, folder layout, `.env.example`, git-ignored `.env.local` / `data-raw/`, placeholder page with uk/en i18n, `deploy` script with `base: '/uhmi-climate/'`. Test, lint and build pass.
