# Progress log

Plan: `docs/DEV_PLAN.md`. Update this file at every checkpoint.

## Status

| Phase | Checkpoint | Status | Date |
| --- | --- | --- | --- |
| P0. Project setup | CP0 | done (OK 2026-10-06) | 2026-10-06 |
| P1. Data extraction | CP1 | done (OK 2026-10-06) | 2026-10-06 |
| P2. Map data build | CP2 | done (OK 2026-10-06) | 2026-10-06 |
| P3. App shell | CP3 | waiting for OK | 2026-10-06 |
| P4. Map | CP3 | waiting for OK | 2026-10-06 |
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
- 2026-10-06 — CP1 decisions: copy the old continuous fill (two colours, alpha by |value|) but tint observation layers with their own range; observations baseline 1961–1990 as on the old site; Latin look-alike letters in names mapped to Cyrillic in P2; "Yampil" duplicate kept and listed as a known limitation.
- 2026-10-06 — P2: simplification kept light because sizes allow it: oblasts, rayons, basins unsimplified; hromady keep 75 % (477 KB gzip vs 900 target). Ukraine outline = dissolved oblasts.
- 2026-10-06 — P2: station ids are unique per location (`Yampil-2`, `Mizhhir'ya-2`); the API `place` stays the source name in a `place` property.
- 2026-10-06 — P4: CARTO tiles now need a key; the user chose to try the old site's CARTO key first (works from localhost and github.io). It lives in `.env.local` as `VITE_CARTO_KEY`, like the API key. Fallback if it stops working: OpenFreeMap Positron without labels.
- 2026-10-06 — P4: legend is a continuous gradient bar with step ticks (the fill is continuous), not discrete swatches.
- 2026-10-06 — P4: station labels use self-hosted glyphs (Open Sans Semibold, Latin + Cyrillic ranges, from the MapLibre demo font set) in `public/fonts/`.
- 2026-10-06 — P3/P4: default view as on the old site (temperature, RCP8.5, year, 2011–2020) with oblasts. A temporary select panel (`DevSwitcher.vue`) switches the view until the P5 dialog replaces it.
- 2026-10-06 — User rule for the whole project: colours may be changed for better readability; report each change at the checkpoint.
- 2026-10-06 — Global npm 10.9 crashes on install; installs run via `npx npm@11` — npm bug, not project-specific.

## Open issues

- Kyiv city has no hromada polygon in the source data (white hole at hromada level); same on the old site? Check at CP3.
- Phone widths below ~555 px can't be checked by resizing the Chrome window; use DevTools device mode in P7.
- MapLibre 6 ships its worker separately (511 KB raw), partly duplicating the main bundle — look at it in P8.
- Known limitation: two precipitation stations named "Yampil"; the API keys stations by name, so "Yampil-2" (Cherkasy area) can't be addressed separately.
- Old site's precipitation projection grid is labelled "grid 0.1x0.1°" (temperature: 0.11°) — label typo, same nodes.
- Data owner's review of the extracted values after returning from leave.
- `npm audit`: 12 advisories (10 high), all in mapshaper's dev-only dependency tree (image-size, file-type); not shipped to the browser. Revisit if a mapshaper fix lands.

## Log

_(date — phase — what was done)_

- 2026-10-06 — P0 — Scaffold (TS, Pinia, Router, Vitest, ESLint + Prettier, no E2E), project deps, folder layout, `.env.example`, git-ignored `.env.local` / `data-raw/`, placeholder page with uk/en i18n, `deploy` script with `base: '/uhmi-climate/'`. Test, lint and build pass.
- 2026-10-06 — P1 — `npm run data:extract`: finds chunks via index.html → app.js chunk map, downloads 22 files (71 MiB) with sha256 manifest (repeat run downloads nothing), acorn AST → JSON, signature classifier, config extraction (vizItem, ranges, legends, decade labels, getServerParams), validation report, 57 API smoke requests (all 200). Repeat run gives byte-identical GeoJSON. First `src/config/layers.ts` (12 layers, scales) and uk/en layer names. Unit tests for AST conversion and classifier.
- 2026-10-06 — P2 — `npm run data:build`: 28 content-hashed files + `index.json` in `public/data/` (5 TopoJSON levels, 18 value files, 4 point files, search index with 2.3k entries). Values ↔ geometry join 100 %; 605,450 values identical to the source (max diff 0). Overlay SVGs in `data-raw/overlays/`, report in `data-raw/build-report.md`. Rebuild is byte-identical.
- 2026-10-06 — P3+P4 — URL ↔ Pinia sync (replace-only, 150 ms debounce), view rules, data store (index.json, de-duplicated loads, stale loads aborted), MapLibre map with all 12 layers, feature-state colouring (old site's continuous rule), hover/selection, tooltip, legend, header with the institute's logos, PNG export, uk/en. Hromada recolour 0.8 ms. Checked in Chrome (dev + production preview): no console errors.
