# Progress log

Plan: `docs/DEV_PLAN.md`. Update this file at every checkpoint.

## Resume here (2026-10-06)

- **State:** P0–P10 done. **CP7 is waiting for the user's OK** (user reads the package, runs the demo script, records the backup video). Package: `docs/presentation/` (index in its README); slides: Slides artifact https://claude.ai/artifact/1KreDMuDDKXDG3RxbPaUGP (private to the user; PPTX/PDF from its menu), source in `docs/presentation/deck/`.
- **Next:** after CP7, only fixes the user asks for. The label fix (`bfd1565`) needs one more push + deploy; the shared-link screenshots were taken from a local build of it.
- **Open user decisions:** none. Title stays "Кліматичні зміни в Україні" (user, after CP4).
- **Changes after CP5, all user requests, already done:** basemap choice + basin outlines, checkbox fix, one radius system, fit-to-data button.
- **How to check:** dev server (user runs it) http://localhost:5173/uhmi-climate/; responsive page `/uhmi-climate/dev/viewports.html?w=360,768&q=<encoded app query>`; `?debug=1` → `window.__map`. Commands: `npm test`, `npm run lint`, `npm run type-check`, `npm run data:check`, `npm run build`.

## Status

| Phase | Checkpoint | Status | Date |
| --- | --- | --- | --- |
| P0. Project setup | CP0 | done (OK 2026-10-06) | 2026-10-06 |
| P1. Data extraction | CP1 | done (OK 2026-10-06) | 2026-10-06 |
| P2. Map data build | CP2 | done (OK 2026-10-06) | 2026-10-06 |
| P3. App shell | CP3 | done (OK 2026-10-06) | 2026-10-06 |
| P4. Map | CP3 | done (OK 2026-10-06) | 2026-10-06 |
| P5. Controls modal | CP4 | done (OK 2026-10-06) | 2026-10-06 |
| P6. Charts and API client | CP5 | done (OK 2026-10-06) | 2026-10-06 |
| P7. Responsive and accessibility | CP6 | done (OK 2026-10-06) | 2026-10-06 |
| P8. Performance | CP6 | done (OK 2026-10-06) | 2026-10-06 |
| P9. Unit tests and data parity | CP6 | done (OK 2026-10-06) | 2026-10-06 |
| P10. Presentation package (Ukrainian) | CP7 | waiting for OK | 2026-10-06 |

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
- 2026-10-06 — Readability (CP3): fill alpha = sqrt(|v| / max) × 0.9 instead of the old linear rule, so small anomalies stay visible; borders darker (rgba(33,40,46,0.85)) and slightly wider; legend labels 12 px, darker.
- 2026-10-06 — P5: chip lives inside ControlsDialog (it is the dialog trigger, so focus returns to it); no separate ViewSummaryChip.vue. Dataset buttons show short names, the full name + period is a hint line below.
- 2026-10-06 — P5: arrow keys select territory levels (radio-group convention); segmented controls activate with Enter/Space.
- 2026-10-06 — P5: legend ends snap outwards to whole steps (observations −1.5…3 °C instead of −1.4…3.1).
- 2026-10-06 — CP4 feedback: the old site's "Additional information" popup (citation rules, Euro-CORDEX sources, 32-model table, glossary) is required. Extracted from the bundle's compiled Vue render code by `scripts/extract/info.ts` (AST, tag whitelist, uk + en), published as `content/info-{uk,en}`, shown by an ⓘ button in the header and a link in the settings "About".
- 2026-10-06 — Header (user request): app title on the left; on the right UHMI emblem + "Український гідрометеорологічний інститут / ДСНС України та НАН України" (en: "Ukrainian Hydrometeorological Institute / SES of Ukraine and NAS of Ukraine") │ lab mark + lab name (uk/en image), then ⓘ. All header text follows the UI language. Tablet: emblems only; phone: institute emblem + title.
- 2026-10-06 — P6: as on the old site, the 2.5–97.5 % band is drawn in absolute mode only (the API has no anomaly quantiles); notes under the chart are the old site's texts (uk anomaly note translated).
- 2026-10-06 — P6: chart units: temperature °C; precipitation mm (absolute and observed anomalies), % for projection anomalies — as the API returns them.
- 2026-10-06 — P6: map data now loads on MapLibre `style.load` instead of `load` (which waits for every basemap tile — up to ~9 s on large high-DPI screens).
- 2026-10-06 — P6: Vite pre-bundles maplibre-gl, chart.js, vue-chartjs, the annotation plugin and topojson-client (runtime discovery re-optimised deps mid-session and broke the MapLibre worker until reload).
- 2026-10-06 — Added at the user's request (after CP5): basemap choice as on the old site — CARTO light (default, old "Esri без позначень"), Visicom (TMS, no key needed), Esri World Topo — plus the "Річкові басейни" outline overlay (from the extracted basin-names set, `geo/basin-outlines`). Both in the URL (`bm`, `basins=1`), in the settings dialog, and in PNG credits. Attributions corrected (the old site credits "USGS, NOAA" on CARTO).
- 2026-10-06 — Map readiness: wait for the style itself (`style._loaded`), not `load`/`isStyleLoaded()`, which also wait for basemap tiles and could miss the event with uncached tiles.
- 2026-10-06 — P7: responsive checks run in Chrome through `dev/viewports.html` (dev-only page, the app in iframes at 360/390/768/1024/1366/1440 and 844×390 landscape) because the maximised Chrome window cannot be resized; Firefox pass done by the user.
- 2026-10-06 — P7: tablets (600–1023 px): legend 260 px, chart card beside it; low windows / landscape phones (≤ 500 px tall): chart as a full-height side panel, compact chart legend; phones: chip + stepper sit above the chart sheet, legend strip above the map attribution; min zoom 3 so a 360 px phone fits all of Ukraine.
- 2026-10-06 — P8: lazy chunks — chart panel + API client + zod (26 KB), Chart.js view (71 KB), settings panel (27 KB), info dialog, English dictionary, map PNG export, gtag adapter. Font: Inter variable, Latin + Cyrillic woff2 (65 KB), preloaded, `font-display: swap`. Favicon: the climate icon (was create-vue's).
- 2026-10-06 — P8: `?debug=1` exposes the map as `window.__map` (also on github.io) for performance checks.
- 2026-10-06 — P9: `npm run data:check` samples 50 features round-robin over all 18 value files × 5 random combinations (250 values, tolerance 0.005); `data:build` already compares all 605,450 values.
- 2026-10-06 — P9: visual colour parity with the old site is no longer 1:1 by design (CP3 readability change to a square-root curve); value parity is covered by data:check.
- 2026-10-06 — User request: one radius system — 12 px for every floating box (chip, stepper, legend/hint, chart panel, dialogs, map zoom control), 8 px for controls inside boxes, 4 px for tiny marks; nested items use the parent radius minus padding. Only tokens (`--radius`, `--radius-sm`, `--radius-xs`) in components.
- 2026-10-06 — User request: "fit all data" button under + − (MapLibre control, same style). Fits to the bounds of the current layer's data (basins and the projection grid reach beyond Ukraine), keeping clear of an open chart card (desktop/tablet) or the chart sheet and chip bar (phones).
- 2026-10-06 — Global npm 10.9 crashes on install; installs run via `npx npm@11` — npm bug, not project-specific.

- 2026-10-06 — P10: Lighthouse median of 3 runs per site and profile instead of one run (single runs varied: one mobile run showed 2.3 s TBT while other work ran). Only the median HTML reports are kept; the CARTO key in tile URLs is redacted.
- 2026-10-06 — P10: deck made as a Slides artifact (PPTX/PDF download from its menu) instead of separate PPTX/PDF files; source copied to `docs/presentation/deck/`. Backup screen recording is the user's (not scriptable here).
- 2026-10-06 — Chart drawn without animation: Chart.js animations need animation frames, and the chart stayed blank or stale until a mouse move (user report).

## Open issues

- Kyiv city has no hromada polygon in the source data (white hole at hromada level); same on the old site? Check at CP3.
- First-visit JS: 359 KB main (target ≤ 400) + 142 KB MapLibre worker = 501 KB. The worker is MapLibre's own (it was inlined in MapLibre 5); no way to share code between page and worker. Total first visit ≈ 620 KB (target ≤ 700), first-screen data 25 KB (≤ 100).
- Hromada first draw: 0.4–0.6 s on github.io with an empty cache (fast connection); recolour of 1779 features 1.2 ms.
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
- 2026-10-06 — P5 — Controls dialog (Reka UI): territory search (index on first focus, ranked, highlighted), dataset/variable/scenario/season toggles, level picker with reasons and loading state, decade slider, on-map decade stepper with play, stepper checkbox in localStorage, language, PNG export, About. Side panel ≥ 600 px, bottom sheet with swipe-down below. Temporary select panel removed.
- 2026-10-06 — P6 — API client (request builder for all 12 layers, zod parsing, sort, reshape to hist/rcp45/rcp85, LRU + sessionStorage cache, merged in-flight, abort, 10 s timeout, one retry for network/502/503, 500 → "no series"), 12 recorded fixtures, chart panel (Chart.js lazily loaded): ensemble means + band, observations, tm/tn/tx for observed temperature, selected decade band, values/change and yearly/moving toggles, CSV + PNG export, skeleton and error states, phone bottom sheet. Hromada "state territories" (None_*) get no "community" suffix.
- 2026-10-06 — P7–P9 — responsive fixes at all widths incl. landscape phones, map canvas label, lazy loading of everything not on the first screen, Inter font, analytics hook (off), favicon, `npm run data:check`, dev viewport page. 75 unit tests, data:check 250/250, build within targets except the MapLibre worker (see open issues).
- 2026-10-06 — P10 — Lighthouse ×3 per site/profile on github.io vs the old site (mobile Performance 72 → 92, Accessibility 78 → 100, LCP 9.2 → 3.2 s, 10–23 MB → 0.8 MB), JS heap, cold hromada draw; screenshot pairs; 10-slide Ukrainian deck with speaker notes; demo script, API slide, handover notes, results table. Fixes found on the way: static header in index.html (mobile FCP 2.9 → 0.8 s), map fit for links that open a chart, chart drawn without animation (was blank until a mouse move), min zoom recomputed on resize, chart loader, legend label collision, decade label clipped at the chart ends, lint (typed mocks).
