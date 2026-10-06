# Progress log

Plan: `docs/DEV_PLAN.md`. Update this file at every checkpoint.

## Status

| Phase | Checkpoint | Status | Date |
| --- | --- | --- | --- |
| P0. Project setup | CP0 | done (OK 2026-10-06) | 2026-10-06 |
| P1. Data extraction | CP1 | waiting for OK | 2026-10-06 |
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
- 2026-10-06 — P1: 13 source files + `basin-names` instead of 12: stations come as two point sets (temperature 178, precipitation 224); the station layer switches set with the variable, as on the old site.
- 2026-10-06 — P1: the API key is written to `.env.local` by the script (only if empty) and never printed — instead of printing it for manual copy.
- 2026-10-06 — P1: no `mapshaper -check` exists; geometry validity = structural checks (closed rings, finite coords in bbox). Topology is cleaned in P2.
- 2026-10-06 — Global npm 10.9 crashes on install; installs run via `npx npm@11` — npm bug, not project-specific.

## Open issues

- Legend scale: keep 1:1 or also show an alternative? Note: the old fill is continuous (two colours, alpha = |v| / max |range|), not classed; the legend shows 0.5 °C / 5–10 % steps.
- Old site bug: observation polygons are tinted with the projection range (T ±6.4, P −42…50) while their legend uses the observation range (T −1.4…2.7, P −35…109). Copy 1:1 or fix?
- Observations baseline on the old site is 1961–1990 (projections 1981–2010); the plan says 1981–2010 for both.
- 1453 hromada names use Latin look-alike letters (a, o, p, e, O) — normalise to Cyrillic in P2?
- Two precipitation stations named "Yampil": the API keys stations by name, so one of them can't be addressed.
- Old site's precipitation projection grid is labelled "grid 0.1x0.1°" (temperature: 0.11°) — label typo, same nodes.
- Data owner's review of the extracted values after returning from leave.
- `npm audit`: 12 advisories (10 high), all in mapshaper's dev-only dependency tree (image-size, file-type); not shipped to the browser. Revisit if a mapshaper fix lands.

## Log

_(date — phase — what was done)_

- 2026-10-06 — P0 — Scaffold (TS, Pinia, Router, Vitest, ESLint + Prettier, no E2E), project deps, folder layout, `.env.example`, git-ignored `.env.local` / `data-raw/`, placeholder page with uk/en i18n, `deploy` script with `base: '/uhmi-climate/'`. Test, lint and build pass.
- 2026-10-06 — P1 — `npm run data:extract`: finds chunks via index.html → app.js chunk map, downloads 22 files (71 MiB) with sha256 manifest (repeat run downloads nothing), acorn AST → JSON, signature classifier, config extraction (vizItem, ranges, legends, decade labels, getServerParams), validation report, 57 API smoke requests (all 200). Repeat run gives byte-identical GeoJSON. First `src/config/layers.ts` (12 layers, scales) and uk/en layer names. Unit tests for AST conversion and classifier.
