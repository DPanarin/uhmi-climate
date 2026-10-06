# Climate Viewer on Vue 3 — dev plan

> Exported from the Claude Doc “Climate Viewer on Vue 3 — dev plan” (https://claude.ai/code/artifact/08c7bbc3-3b4c-4487-bf35-8d7912c23c4e) on 2026-10-06. If the doc and this file disagree, ask the user which is current.

Oct 6, 2026 · Dmitriy

## How to use this plan

This plan is the source of truth for the Claude Code session that builds the prototype. A copy lives in the repo as `docs/DEV_PLAN.md`; `CLAUDE.md` in the repo root points to it and repeats the rules below.

1. **Work phase by phase**, P0 → P10, in order. Before a phase, re-read its section and the Reference section.
2. **Stop at every checkpoint (CP0–CP7).** Post a checkpoint report: what was done; how to see it (URL, command); what the user should verify (from the checkpoint table); deviations from the plan and known limitations. Then wait for an explicit “OK”. Do not start the next phase without it; fix requested changes first.
3. **Keep `docs/PROGRESS.md`** up to date: date, phase, what was done, decisions taken, open issues.
4. **Verify live while building.** Keep `npm run dev` running (`http://localhost:5173`). After each visible change, check the page in Chrome (DevTools device toolbar at 360, 768, 1366 and 1440 px) and the console for errors.
5. **Ask instead of guessing** when the old site or API behaves differently from this plan, when a choice changes scope, or when a phase runs more than 50% over its estimate.
6. **Never** commit `.env.local`, the API key or `data-raw/`; never push to any GitHub account other than the user’s personal one; never call the API in loops — smoke checks stay under \~100 sequential requests per run.
7. **Keep it simple:** unit tests only, no E2E, no CI pipelines, one-command deploy.
8. **Languages:** code and comments in English; UI text only through the `uk`/`en` dictionaries; the presentation package in Ukrainian; communication with the user in English, kept brief.

## Decisions and constraints

Goal: a working prototype of [climate.uhmi.org.ua](https://climate.uhmi.org.ua/) with the same functionality — 12 map layers, projections and observations, a time-series chart on click — rebuilt on Vue 3 with a responsive layout, map data loaded on demand, and the existing `api.uhmi.org.ua` for charts. It will be presented to the Ukrainian Hydrometeorological Institute (UHMI).

Decided by the user:

- **Stack:** Vue 3 + TypeScript + Vite.
- **Site languages:** Ukrainian (default) and English.
- **API key:** the same key the current site uses (permission granted).
- **Map data:** extracted by a script from the current site’s JS bundles (no source files available; the data owner is on leave).
- **Controls:** everything in one modal. The decade slider is always in the modal; an on-map decade stepper duplicates it and is shown or hidden by a checkbox in the modal.
- **Territory search** by name, inside the modal.
- **Hosting:** GitHub Pages on the user’s personal GitHub account (not Innate Instruments). Deploy is one local command; no CI.
- **Google Analytics:** not included; a hook is prepared so it can be switched on later.
- **Project folder:** `~/WebstormProjects/uhmi/climate` on the user’s Mac.
- **Development:** local dev server, live checks in the browser throughout.
- **Testing:** unit tests (Vitest) only. Responsive layout is checked by hand in Chrome and Firefox; Safari is not tested.
- **Lighthouse:** measured once, on the finished app deployed to GitHub Pages.
- **Checkpoints:** stop after each phase group for the user’s verification.
- **Presentation package:** in Ukrainian.

Out of scope for the prototype: E2E tests, CI pipelines, Safari / iOS testing, dark theme, analytics and cookie banner, vector tiles (unless P2 budgets fail).

## UI principles and stack

The interface stays minimal: on screen only the map, the current-view chip, the decade stepper (if enabled) and the legend; everything else lives in the modal.

- **Elements:** segmented controls instead of dropdowns for 2–5 options; a bottom sheet on phones; a combobox with highlighted matches for search; chips; skeletons instead of spinners; a toast for network errors; Lucide icons.
- **Visual language:** design tokens as CSS custom properties (colours, 12 px radius, 4/8 px spacing scale, two shadow levels); floating panels with a light `backdrop-filter` blur (solid fallback); 150–200 ms transitions.
- **Font:** one variable woff2 with Cyrillic (e.g. Inter) instead of the three families on the old site.
- **Primitives:** Reka UI headless components (Dialog, Combobox, Slider, ToggleGroup) with our own styles — keyboard and ARIA handled, no heavy visual kit.
- **Theme:** light only (light basemap); dark theme is out of scope.

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite 6 + TypeScript | fast dev server with hot reload; code splitting without prefetch |
| Framework | Vue 3 (Composition API, `<script setup>`) | decided; close to the institute’s current Vue 2.7 code |
| State | Pinia + URL sync through vue-router | a link reproduces the map view |
| Map | MapLibre GL JS 5 | WebGL: 1779 hromadas and \~7k grid points without thousands of DOM nodes; changing the decade only changes paint state |
| Charts | Chart.js 4 + vue-chartjs 5 | same engine as the institute’s site; spread band via `fill` |
| UI | Reka UI + own styles, lucide-vue-next icons | accessible Dialog / Combobox / Slider without a heavy kit |
| i18n | vue-i18n: `uk` (default), `en` | strings taken from the old site’s layer config |
| Data | Node scripts + acorn + mapshaper + topojson | reproducible pipeline inside the same repo |
| Tests | Vitest (unit only) | parsers, request builder, view rules, data joins |
| Dev | Vite dev server on `localhost:5173`, checks in Chrome and Firefox | every change visible at once |
| Hosting | GitHub Pages (personal account), `npm run deploy` with the `gh-pages` package | one command from the laptop, no CI |
| Analytics | none; `analytics.track()` no-op module | switched on later by `VITE_GA_ID` without touching components |

## Architecture

Scripts run once and write ready-made files into the repo; the browser loads only the file the selected layer needs and calls the API only when a feature is clicked.

```text
Data build (npm scripts, P1–P2) — run once, output committed to the repo

  old site chunks ──► data:extract ──► data-raw/ ──────────► data:build
  (20 webpack        (acorn, no JS     (12 source GeoJSON,    (mapshaper, TopoJSON,
   chunks)            executed, API     report.md,             values per variable,
                      smoke check)      manifest.json)         search index, size report)
                                                                   │
In the user's browser (P3–P6)                                      ▼
  public/data/ ──► Vue 3 + Pinia ──► MapLibre GL ──(click)──► API client ◄──► api.uhmi.org.ua
  (loaded on       (view ↔ URL,      (fill colour via         (cache, abort,     (same key,
   demand)          controls modal)   feature-state)           sort, errors)      2 endpoints)
                                                                   │
                                                                   ▼
                                                            Chart.js panel
                                                            (series + ensemble spread band)
```

## Phases, estimates and checkpoints

Estimate: 18–26 person-days (about 4–5 weeks), not counting time spent waiting for the user at checkpoints. It is a guide, not a measurement; P1 is the least certain phase. Phases run in order; the next one starts only after the user’s “OK” at the checkpoint. Unit tests are written inside each phase, next to the code they cover.

| Phase | Result | Checkpoint | Estimate, days |
| --- | --- | --- | --- |
| P0. Project setup | repo in `~/WebstormProjects/uhmi/climate`, dev server, personal GitHub repo, first `npm run deploy` | CP0 | 0.5–1 |
| P1. Data extraction | 12 source GeoJSON files + validation report | CP1 | 2–3 |
| P2. Map data build | simplified geometry, value files, search index, size report | CP2 | 2–3 |
| P3. App shell | URL state, layer catalogue, i18n uk/en | CP3 (with P4) | 2 |
| P4. Map | all 12 layers, legend, hover, selection | CP3 | 3–4 |
| P5. Controls modal | all settings, territory search, decade-stepper checkbox | CP4 | 3–4 |
| P6. Charts and API | API client with cache, chart panel, CSV/PNG export | CP5 | 2–3 |
| P7. Responsive and accessibility | phone / tablet / desktop in Chrome and Firefox, keyboard | CP6 (with P8–P9) | 1.5–2 |
| P8. Performance | lazy chunks, font, analytics hook | CP6 | 0.5–1 |
| P9. Unit tests and data parity | test suite green, values match the old site | CP6 | 1 |
| P10. Presentation package | Ukrainian deck, before/after with Lighthouse on github.io, demo script | CP7 | 1–2 |

At each checkpoint Claude stops and sends a short report: what was done, the link (localhost or github.io), what to check, known limitations.

| Checkpoint | After | What is shown | How the user checks | “OK” when |
| --- | --- | --- | --- | --- |
| CP0 | P0 | empty app on localhost and on github.io, commit history | opens both URLs, looks at the commit author | both URLs work, author is the personal account |
| CP1 | P1 | `report.md`, list of 12 files, API smoke results | compares 3 features: tooltip on the old site vs value in the report | values match, 12 of 12 layers answer 200 |
| CP2 | P2 | size report, boundary overlay screenshots | looks at small hromadas, the coastline, Crimea | no visible distortion, sizes within targets |
| CP3 | P3–P4 | map with all 12 layers, view links, uk/en | switches layers, opens a link in a new tab, compares colours with the old site | view restores, colours match |
| CP4 | P5 | modal on desktop and phone width, search, stepper checkbox | goes through the scenarios with mouse and keyboard, and on a phone via github.io | issues fixed or logged |
| CP5 | P6 | charts for 5 control features next to the old site, CSV/PNG export | compares curves and spread bands | charts match |
| CP6 | P7–P9 | screenshots at 360 / 768 / 1366 / 1440 px in Chrome and Firefox, unit test run | checks on own devices (no Safari) | no layout breaks, tests green |
| CP7 | P10 | Ukrainian presentation package, Lighthouse on github.io | reads it, runs the demo script | ready to show to the institute |

## Reference: old site, API and data

Everything below was observed on 2026-10-06 in the browser (network log, bundle analysis, live API calls). Chunk hashes change on every redeploy of the old site — never hardcode them.

### Old site

- [climate.uhmi.org.ua](https://climate.uhmi.org.ua/): Vue 2.7 SPA built with Vue CLI (webpack), Vuex, Leaflet 1.9.4 (SVG renderer), Chart.js + vue-chartjs, d3, html2canvas, axios + qs. Served by Caddy, HTTP/2, gzip, no `Cache-Control`. One route `/`.
- Chunk map: the webpack runtime in `js/app.<hash>.js` holds `{"chunk-xxxx":"<hash>"}` for 20 chunks, all prefetched on first load (\~71 MB raw, \~20 MB gzip).
- Map data: GeoJSON object literals inside 8 + 4 chunks (table below). Values sit in each feature’s `properties`.
- Layer config: a module in `chunk-vendors` with `JSON.parse('{"vizItem":{…}}')` — layer names UA/EN, chart titles, tooltips.
- App logic: `chunk-0730845a` — `serverUrl`, `serverKey` (the API key, a JWT), `getServerParams` (layer → API params), legend scales, slider labels.

| Dataset | Features | Chunk on 2026-10-06 | Raw, MiB | Signature fields |
| --- | --- | --- | --- | --- |
| Hromadas · projections | 1779 | chunk-29ecf1fe | 27.2 | `COD_3`, `ADMIN_1..3`, `ADMIN_3_eng`, `TYPE`, `KOATUU_old`, `tmp_rcp*` |
| Hromadas · observations | 1779 | chunk-83d4ffb8 | 17.8 | `COD_3`, `Tm_*observed*` |
| Rayons · projections | 136 | chunk-2fdf6289 | 5.4 | `COD_2`, `ADMIN_1`, `ADMIN_2`, `ADMIN_2_eng`, `tmp_rcp*` |
| Rayons · observations | 136 | chunk-4b8ffb90 | 4.7 | `COD_2`, `Tm_*observed*` |
| Ukraine · projections | 1 | chunk-4a65932c | 6.2 | `tmp_rcp*` |
| Ukraine · observations | 1 | chunk-87c2e07e | 6.2 | `Tm_*observed*` |
| Oblasts · projections | 27 | chunk-49487c88 | 0.5 | `NAME_UA`, `NAME_LAT`, `NAME_RUS`, `TYPE`, `KOATUU`, `tmp_rcp*` |
| Oblasts · observations | 27 | chunk-b0edc286 | 0.35 | `NAME_UA`, `NAME_LAT`, `Tm_*observed*` |
| River basins (projections only) | 13 | chunk-ea63f1a4 | 0.27 | `ID`, `Basin`, `Basin_eng`, `Subbasin`, `Subbasin_eng`, `tmp_rcp*` |
| Grid 0.11° (projections) | 6221 points | chunk-74bf3fe8 | 0.8 | `lat`, `lon`, `Elevation` — no values |
| Grid 0.1° (observations) | 7364 points | chunk-3f64d56f | 0.8 | `lat`, `lon`, `index_right` — no values |
| Weather stations | ~200, count in P1 | chunk-01de6d3a | 0.07 | `station`, `St_UA`, `lat`, `lon` — no values |

Value fields (anomalies vs 1981–2010; numbers carry up to 15 decimals):

- Projections: `{tmp|pcp}_{rcp45|rcp85}_anom[_{winter|spring|summer|autumn}]_{YYYY}_{YYYY}`, 12 decades `1981_1990` … `2091_2100`, e.g. `tmp_rcp45_anom_winter_2041_2050`. 240 fields per feature.
- Observations: `{Tm|RR}[_{season}]_observed_anom_{YYYY}_{YYYY}`, 7 decades `1951_1960` … `2011_2020`, e.g. `Tm_summer_observed_anom_1991_2000`. 70 fields per feature.
- Temperature legend: 16 classes from −1 to 6.5 °C in 0.5 steps. The precipitation scale is read from `chunk-0730845a` in P1.

### API `api.uhmi.org.ua`

Flask/Werkzeug server, no docs endpoint. Two GET endpoints return yearly series for one feature. CORS is open to any origin (verified from example.com). No gzip, no `Cache-Control`; response time 50–1150 ms; 21–49 KB per response.

| Param | `/projections` | `/historical_observations` |
| --- | --- | --- |
| `kind` | `Ukraine`, `oblasts`, `rayons`, `terhromads`, `basins`, `nodes` | `Ukraine`, `oblasts`, `rayons`, `terhromads`, `nodes`, `meteostations` |
| `place` | `Ukraine`; oblast Latin name (`Vinnytska`); rayon `COD_2`; hromada `COD_3`; basin = subbasin or basin name; node = grid point id | same; station Latin name (`Kyiv`) |
| `value_type` | `tas` (temperature), `pr` (precipitation) | `tm`, `tn`, `tx` (mean, min, max; the old site sends all three for temperature), `rr` (precipitation) |
| `rcp` | `rcp45` and/or `rcp85`, repeated (`rcp=rcp45&rcp=rcp85`); `rcp26` → 400 | — |
| `season` | `winter`, `spring`, `summer`, `autumn`; omitted for the annual value | same |
| `key` | required (missing → 400); the JWT from the old site, in `VITE_API_KEY` | same |

Responses: a JSON object whose every field is an array of `[date, "value"]` pairs, value as a string.

- `/projections`: `means`, `anomalies_mean`, `quantile025`, `quantile975` and `moving_*` versions, suffixed `_rcp45` / `_rcp85` when both scenarios are requested; 120 points 1981–2100, date `1981-12-31`. For `Ukraine` and `oblasts` also `hist`, `hist_anomalies`, `hist_moving`, `hist_moving_anomalies`.
- `/historical_observations`: `hist`, `anomalies`, `hist_moving`, `hist_moving_anomalies`; 75 points 1946–2020, date `1946`.
- Example: `GET /projections?rcp=rcp45&rcp=rcp85&kind=oblasts&place=Vinnytska&value_type=tas&key=…` → 200, 47 KB.

Quirks the client must handle: unknown `place` → 500 HTML page (not 404); bad argument → 400 `invalid arguments`; seasonal observation series are not sorted by year; values are strings. The JWT has `exp` = `iat` = 2021-08-19, but the server still accepts it. Which exact GeoJSON field feeds `place` for oblasts and stations (`NAME_LAT`?) is not yet verified — P1 confirms it.

## P0. Project setup

1. **Folder:** the user creates `~/WebstormProjects/uhmi/climate` and starts the Claude Code session in it.
2. **Scaffold:** `npm create vue@latest .` with TypeScript, Pinia, Router, Vitest, ESLint + Prettier; no E2E tool. Node 20 LTS or newer. Add `maplibre-gl`, `topojson-client`, `chart.js`, `vue-chartjs`, `chartjs-plugin-annotation`, `vue-i18n`, `reka-ui`, `lucide-vue-next`, `zod`; dev: `acorn`, `mapshaper`, `gh-pages`.
3. **Layout:** `scripts/` (data), `data-raw/` (git-ignored), `public/data/` (built files), `src/{api,map,stores,components,i18n,config,analytics}`, `docs/` (`DEV_PLAN.md`, `PROGRESS.md`).
4. **Env:** `.env.local` with `VITE_API_URL=https://api.uhmi.org.ua/` and `VITE_API_KEY` (git-ignored); `.env.example` without the key. The key is filled in during P1.
5. **Git under the personal account:** `git init`; local `git config user.name` / `user.email` of the personal account, so no commit goes out as Innate Instruments. Ask the user for the GitHub login and repo name; the repo is public (free GitHub Pages needs a public repo). If the Mac has several GitHub accounts, use an SSH host alias (`github-personal`) or `gh auth` with the personal account.
6. **Deploy, one command:** in `vite.config.ts` set `base: '/<repo>/'`; add `"deploy": "npm run build && gh-pages -d dist"`; in the repo settings, Pages → source: branch `gh-pages`. Site URL: `https://<login>.github.io/<repo>/`. The key from `.env.local` is baked into the built JS, as on the old site (accepted); it never enters the source branch.
7. **Dev server:** `npm run dev` → `http://localhost:5173`, started by the user in the WebStorm terminal or by Claude Code in the background; Claude checks pages in Chrome.
8. **Scripts:** `dev`, `build`, `preview`, `test` (`vitest run`), `lint`, `data:extract`, `data:build`, `deploy`.

**Done when (CP0):** the empty app opens on localhost and on github.io; commits show the personal account as author.

## P1. Data extraction

The data is read by parsing the bundles (AST), never by running them: the chunks are third-party JS. Command: `npm run data:extract`.

1. **Find chunks without hardcoded hashes.** Fetch `index.html` → find `js/app.*.js` → regex out the webpack chunk map. Survives a redeploy of the old site.
2. **Download** all chunks and `chunk-vendors` into `data-raw/chunks/`; write `data-raw/manifest.json` (URL, date, size, sha256). A repeat run with the same sha256 downloads nothing.
3. **Parse** each chunk with `acorn`; find object literals with `type:"FeatureCollection"`; convert the AST to JSON, handling minified forms: `!0` / `!1` → true / false, `void 0` → null, unary minus, `.5`, `1e-3`. Any other node inside a literal (function, identifier) → error with chunk name and offset.
4. **Classify** by field signature, not chunk name (Reference table): `tmp_rcp*` → projections, `Tm_*observed*` → observations; `COD_3` → hromadas, `COD_2` → rayons, `NAME_UA` → oblasts, one feature → Ukraine, `Basin` → basins, `Elevation` → projection grid, `index_right` → observation grid, `station` → stations. Output: 12 files in `data-raw/geojson/`.
5. **Pull config:** the `vizItem` JSON from `chunk-vendors` (layer names UA/EN, chart titles, tooltips) and, from `chunk-0730845a`, legend scales (temperature and precipitation), slider labels and the `getServerParams` rules → `src/config/layers.ts` (hand-checked). The script also prints the `serverKey` it finds; the user confirms and puts it into `.env.local` — it is never written to a tracked file.
6. **Validation report** `data-raw/report.md`; the script exits non-zero if a check fails:
   - feature counts: 1 / 27 / 136 / 1779 in both datasets, 13 basins, 6221 and 7364 grid points; stations counted and recorded;
   - every feature has all 240 projection fields or all 70 observation fields;
   - min / max per variable and the count of empty or NaN values;
   - geometry validity (`mapshaper -check`) and byte-identical geometry between projections and observations.
7. **Match keys with the API.** For each layer record which field feeds `place` (Reference table). Then make real requests for 5 random features per layer (sequential, \~60 requests) and expect 200. If a layer fails, click a feature on the old site and read `place` from its network request.
8. **Unit tests:** AST-to-JSON conversion of minified literals; the signature classifier.

**Done when (CP1):** the report passes; smoke requests return 200 for all 12 layers; a repeat run produces identical files.

## P2. Map data build

Geometry and values are split: a level’s geometry loads once and serves both datasets; values come as a small file per variable. Command: `npm run data:build`, output `public/data/`.

1. **Feature key:** every feature has one `id`, which is also the API `place` (mapping from P1, step 7). `properties` keep only names UA/EN and tooltip labels.
2. **Simplify in mapshaper:** `-clean`, `-simplify visvalingam weighted keep-shapes` with a percentage tuned by eye at zoom 6–10; output TopoJSON with `quantization=1e5`. Shared borders are stored once, so no gaps appear.
3. **Ukraine outline:** `-dissolve` of the oblasts instead of the 6.2 MiB original. Ukraine-level values are taken from the extracted dataset as is.
4. **Values:** columnar JSON per dataset × level × variable, e.g. `values/proj/hromady/tas.json`: `{ids:[…], values:{rcp45:{annual:{"2041-2050":[…]}}}}`, rounded to 0.01. One file holds all scenarios, seasons and decades, so the slider and switches work without network. Total: 4 levels × 2 variables × 2 datasets + basins × 2 = 18 files.
5. **Points** (two grids and stations): compact GeoJSON, coordinates to 4 decimals (\~10 m), `properties` = `id` (+ name for stations). They have no values; values only via the API.
6. **Search index** `search-index.json` for P5: id, level, names UA/EN, oblast, bounding box per feature.
7. **Content-hashed file names** + `data/index.json` (logical name → file). GitHub Pages does not let us set cache headers, so the hash in the name is what keeps old and new data from mixing after an update.
8. **Size report** printed by the script (gzip). Targets are starting points, refined after the first build:

| File | Target, KB gzip | Old site today, KB gzip |
| --- | --- | --- |
| Oblast geometry | ≤ 60 | 144 (with values) |
| Rayon geometry | ≤ 250 | 2030 |
| Hromada geometry | ≤ 900 | 6355 |
| Hromada values, one variable | ≤ 400 | inside 6355 |
| Grid 0.11° | ≤ 120 | 111 |

If hromadas cannot meet the target without visible distortion, the fallback is PMTiles vector tiles (tippecanoe), so the browser loads only the visible area.

9. **Unit tests:** value join (every value id has geometry and vice versa), rounding, file-name hashing.

**Done when (CP2):** 100% of values have geometry and vice versa; values differ from the source by ≤ 0.005 (rounding); simplified borders over the originals show no visible shift at zoom 9; sizes are within targets or the gap is explained.

## P3. App shell

All view state lives in the URL, so any map with an open chart can be shared as a link — handy for the presentation too.

1. **URL schema:** `?ds=proj|obs&lvl=ukraine|oblasts|rayons|hromady|basins|grid|stations&var=tas|pr&rcp=45|85&season=annual|winter|spring|summer|autumn&dec=2041-2050&place=<id>&lang=uk|en`. Two-way sync Pinia ↔ `router.replace`, debounced 150 ms. Invalid combinations are normalised (basins exist only in projections, stations only in observations, a decade outside the dataset’s range → the nearest one).
2. **Layer catalogue** `src/config/layers.ts` — 12 entries: `id`, dataset, level, geometry file, value files, `apiKind`, `place` field, chart variables, decades, legend scale, labels UA/EN. Components know the catalogue, not individual layers.
3. **Pinia stores:** `view` (user selection), `data` (loaded files, de-duplicated concurrent loads, loading state), `chart` (series from the API).
4. **Data loader:** reads `data/index.json`, loads files by logical name, cancels stale loads with `AbortController`. No prefetch: the next level loads only when chosen.
5. **i18n:** `uk` / `en` dictionaries; `<html lang>` follows the language; numbers via `Intl.NumberFormat` (decimal comma in `uk`).
6. **Screen layout:** full-viewport map (`100dvh`) with four overlay zones: header with logos, settings chip, legend, chart panel.
7. **Unit tests:** URL parse / serialise round-trip, normalisation rules.

**Done when:** opening a URL with parameters restores the same view; the browser Back button is not flooded by every slider move.

## P4. Map

1. **MapLibre init:** `fitBounds` to Ukraine with width-dependent padding (on phones, leaving room for the bottom sheet); rotation and pitch off; zoom 5–11.
2. **Basemap:** the same CARTO `light_nolabels` raster with attribution, so the demo looks familiar; configurable, so it can be swapped.
3. **Fill:** TopoJSON → GeoJSON (`topojson-client`) → source with `promoteId: 'id'`. Colour from `feature-state.v` through a `step` expression over the legend classes. Changing scenario / season / decade = a loop over `ids` with `setFeatureState` (up to 1779 calls), no layer rebuild. Missing value → grey and “no data” in the tooltip.
4. **Scales:** the old −1…6.5 °C scale is kept 1:1 (early decades fall into one or two classes — a flag in config allows showing an alternative scale, off by default).
5. **Borders and states:** separate line layer; hover and selection via `feature-state` with a single current id, so hover highlights never get stuck as on the old site.
6. **Tooltip:** name + value with unit. On touch the first tap selects the feature and opens the chart (phones have no hover).
7. **Point layers:** grids as a `circle` layer, radius by zoom, neutral colour (no values) with the hint “tap a point to see its series”; stations as labelled points from zoom 7.
8. **Legend:** classes and unit from the catalogue, caption “vs 1981–2010”; on phones it collapses to a colour strip.
9. **PNG export** (replaces html2canvas): `map.getCanvas()` after `idle` + legend, title and attribution drawn on a 2D canvas.

**Done when (CP3, together with P3):** all 12 layers draw and respond to clicks; recolouring hromadas on a decade change takes ≤ 50 ms on the laptop (measured with `performance.now()`); colours match the old site for the same view.

## P5. Controls modal

All settings and territory search live in one modal; changes apply immediately (no “Apply” button). On the map remain only the chip describing the current view and — if enabled by the checkbox — the decade stepper.

| Group | Element | Options | Rules |
| --- | --- | --- | --- |
| Search | combobox with suggestions, top of the modal | oblasts, rayons, hromadas, basins, stations — by name UA or EN | each result shows level and oblast (hromada names repeat); choosing closes the modal, switches level, zooms the map and opens the chart |
| Data | segmented control | Projections (Euro-CORDEX) · Observations 1946–2020 | changes available levels, scenario and decade range |
| Variable | segmented | Temperature · Precipitation | changes the legend scale |
| Territory | radio list | Ukraine · Oblasts · Rayons · Hromadas · Basins · Grid · Weather stations | options not in the dataset are disabled with a reason; loading indicator on the item |
| Scenario | segmented + one-line explanation | RCP4.5 medium emissions · RCP8.5 high | hidden for observations |
| Season | segmented | Year · Winter · Spring · Summer · Autumn | — |
| Period | decade slider | 12 decades 1981–2100 or 7 decades 1951–2020 | always in the modal; synced with the on-map stepper; `aria-valuetext="2041–2050"` |
| General | checkbox and buttons | “Show decade stepper on the map” · Language UA/EN · Export PNG · About | checkbox on by default; “About” is a collapsible block |

1. **Components:** `ControlsDialog.vue`, `TerritorySearch.vue`, `SegmentedControl.vue`, `LevelPicker.vue`, `DecadeSlider.vue`, `ViewSummaryChip.vue`, `DecadeStepper.vue`. All read and write the `view` store and hold no state of their own.
2. **Dialog:** Reka UI `Dialog` — focus trap, Esc, scroll lock and ARIA built in. On open, focus goes to search (on phones to the title, so the keyboard does not pop up); on close, back to the chip. Groups are `fieldset` + `legend`.
3. **Desktop (≥ 1024 px):** side modal on the right, 400 px, light backdrop — the map on the left stays visible, so changes are seen at once.
4. **Phone (< 600 px):** bottom sheet up to 75 dvh with a handle and swipe-down to close; the top quarter of the map stays visible; `env(safe-area-inset-bottom)`. Tablet: like desktop, 360 px.
5. **Current-view chip:** a button that opens the modal: “Температура · RCP8.5 · Рік · Області”. Long values are shortened; the full text goes to `aria-label`.
6. **On-map decade stepper:** “‹ 2041–2050 ›” next to the chip, arrow keys when focused, a “▶” button to animate through decades. It duplicates the slider in the modal (both write the same store field). Shown or hidden by the checkbox in “General”; the choice is kept in `localStorage` (a personal preference, not part of the link).
7. **Territory search:** Reka UI `Combobox`. `search-index.json` (from P2) loads on first focus. Matching ignores case and apostrophes (`'` `’` `ʼ`), prefers word-start matches, shows up to 20 results; \~2k entries, so no library. Searches the levels available in the current dataset.
8. **Rule cascade:** pure function `normalizeView(view, catalogue)` in the store: switching dataset moves the decade to the nearest available and replaces an unavailable level with Oblasts.
9. **Sizes:** touch targets ≥ 44 px, text ≥ 14 px, AA contrast.
10. **Unit tests:** `normalizeView`, search normalisation and ranking.

**Done when (CP4):** every one of the 12 layers with any valid settings can be chosen with the keyboard alone; search finds a hromada from its first 3 letters and opens its chart; the checkbox hides and restores the stepper and remembers it after reload; the modal works at 360 px width with no horizontal scroll.

## P6. Charts and API client

The client covers the API’s gaps in the browser: it sorts series, turns strings into numbers, caches responses and turns a 500 into a clear message.

1. **Request builder** `buildRequest(layer, featureId, view)` → path (`projections` or `historical_observations`) and params `kind`, `place`, `value_type`, `rcp` (repeated via `URLSearchParams.append`), `season` (omitted for the year), `key` from `VITE_API_KEY`. Projections ask for both scenarios in one request; observed temperature makes three parallel requests `tm`, `tn`, `tx`, as the old site does.
2. **Response parsing:** zod schema + normalisation: `["1981-12-31","-0.55"]` and `["1946","0.31"]` → `{year, value}`; `nan` / empty → `null` (gap in the line); sort by year; keys such as `means_rcp45`, `quantile025_rcp85`, `hist_moving` are reshaped into `{hist, rcp45, rcp85}` with `mean`, `anomaly`, `q025`, `q975` and their moving versions. An unknown key logs a warning instead of failing.
3. **Cache and cancel:** key = URL without `key`; in-memory LRU of 100 responses + `sessionStorage`; identical in-flight requests are merged; a new click aborts the previous request (`AbortController`); 10 s timeout.
4. **Errors:** network or 502/503 → one retry after 1 s, then “Server unavailable” with a Retry button; 500 → “No series for this feature” (that is how the API answers an unknown `place`), no retry; 400 → error message + console log with the params (without the key).
5. **Chart panel:** desktop — card at the bottom right, 520×380 px, height capped at `calc(100dvh - 160px)`; phone — bottom sheet at half height, swipe up to expand. Hidden while the modal is open, back after it closes.
6. **Chart (Chart.js 4):** observations — black line; RCP4.5 and RCP8.5 — blue and red ensemble-mean lines with a 2.5–97.5% band via `fill: '-1'`; the decade selected on the map is highlighted by a vertical band (annotation plugin), so map and chart stay linked. Toggles: absolute values / anomalies, yearly / moving average. The note under the chart explaining the band is taken from the old site.
7. **Export:** CSV of the shown series and PNG via `chart.toBase64Image()` with title and source.
8. **States:** skeleton while loading, error messages from step 4; the chart reopens from `place=` in the URL.
9. **Unit tests** on fixtures — real responses recorded once for each `kind` of both endpoints: parser, sorting, reshaping, `buildRequest` for all 12 layers, error mapping.

**Done when (CP5):** unit tests pass; a repeat click on the same feature makes no network request; chart values match the old site for 5 control features.

## P7. Responsive layout and accessibility

Main rule: no element is wider than the viewport. Checked by hand in Chrome (DevTools device toolbar) and Firefox (Responsive Design Mode) at 360, 390, 768, 1024, 1366 and 1440 px; in the console `document.documentElement.scrollWidth === innerWidth` must be `true`. Safari is not tested.

| Zone | Phone < 600 px | Tablet 600–1023 px | Desktop ≥ 1024 px |
| --- | --- | --- | --- |
| Header | institute icon + title, 48 px | both logos without captions | as today, 60 px |
| Chip + decade stepper | bottom centre, above the safe area | top left | top left |
| Modal | bottom sheet up to 75 dvh | side, 360 px | side, 400 px |
| Legend | colour strip above the chip, tap for labels | bottom left | bottom left |
| Chart | bottom sheet 50 → 90 dvh | card bottom right | card bottom right |

1. CSS grid + `clamp()`, no fixed widths or heights; handle low windows (≤ 700 px tall) and landscape phones (the modal becomes a side panel).
2. Semantics: `button`, `fieldset`, Reka UI sliders and combobox with ARIA, `<html lang>` (`uk` / `en`); visible `:focus-visible`; text contrast ≥ 4.5:1.
3. Territory search from P5 doubles as keyboard access to map features.
4. `prefers-reduced-motion`: no decade animation and no animated map flights.
5. All UI text comes from the `uk` and `en` dictionaries; a unit test checks both have the same keys; long Ukrainian labels are checked at 360 px.

## P8. Performance

1. **First-visit targets** (gzip, read from the `vite build` output and the P2 size report): JS ≤ 400 KB including MapLibre, first-screen data (oblasts) ≤ 100 KB, total ≤ 0.7 MB excluding basemap tiles.
2. **Lazy chunks:** Chart.js and the chart panel on first click; export; search index; English dictionary. Prefetch off.
3. **Font:** one variable woff2, Cyrillic + Latin subset, `font-display: swap`, preloaded (the old site ships Roboto as TTF, 328 KB).
4. **Caching on GitHub Pages:** headers cannot be configured and Pages compresses on its own; hashed file names (P2, step 7) keep updates safe. Enough for a prototype; `immutable` caching and brotli come later on the institute’s server.
5. **Analytics hook, off:** `src/analytics` with one `track(event, params)` and the event list (`view_change`, `place_open`, `search_select`, `export`). Without `VITE_GA_ID` it is a no-op and no Google script loads; with it, a lazily loaded gtag adapter. Switching it on later also needs a cookie-consent banner — out of scope.

## P9. Unit tests and data parity

1. `npm test` (Vitest) green. Covered: AST-to-JSON and classifier (P1), value join and rounding (P2), URL state and `normalizeView` (P3, P5), legend classing (P4), search ranking (P5), `buildRequest`, parser and error mapping (P6), dictionary key parity (P7).
2. **Data parity script** `npm run data:check`: 50 random features × 5 parameter combinations, built value files vs the extracted source; must match to 0.005.
3. **Visual parity by hand:** 5 oblasts, same view on the old and new site, screenshots side by side for the user to compare colours.
4. Not in the prototype: E2E, visual regression, API contract jobs, CI.

**Done when (CP6, for P7–P9):** no layout breaks in Chrome and Firefox at the listed widths; tests and the parity script pass; first-visit targets met or the gap explained.

## P10. Presentation package (in Ukrainian)

1. **Language and terms:** all materials in Ukrainian; terms match the current site (територіальні громади, сценарій високих викидів, зміна відносно 1981–2010).
2. **Final deploy** with `npm run deploy`; everything below is measured on the github.io URL.
3. **Lighthouse, once, on the deployed app:** mobile and desktop profiles, clean cache, for both the old site and github.io. One “було / стало” table: first-visit bytes, LCP, TBT, Performance and Accessibility scores, plus JS heap and hromada recolour time measured in Chrome.
4. **Deck of 8–10 slides** (PDF and PPTX): what was wrong → what was done → before / after in numbers → demo → what to improve in the API → next steps.
5. **Screenshot pairs** old / new at 390, 1366 and 1440 px.
6. **3–5 minute demo script** with speaker notes: link with a ready view → hromada search → decade animation to 2100 → chart → copy the link and open it on a phone (shareable link + mobile view, see item 9). Plus a backup screen recording in case the network fails.
7. **“Що покращити в API” slide:** gzip, `Cache-Control`, 404 instead of 500, sorted series, numbers instead of strings, `exp` check and key rotation, OpenAPI, an endpoint with map values (it would make the extraction script unnecessary).
8. **Handover:** README and data-pipeline notes in Ukrainian, decision list (why MapLibre, why data outside the bundle), links to the repo and github.io.
9. **Must be presented (user request, 2026-10-06)** — each gets its own slide and a step in the demo script:
   - **Fully functional mobile view:** the same features on a phone as on desktop — bottom-sheet settings with territory search, chart as a bottom sheet (drag to expand), on-map decade stepper, legend strip, fit-to-data button; show it live on a real phone (github.io) plus phone screenshots (360/390 px).
   - **Shareable direct links with the selected data:** every view lives in the URL (dataset, territory level, variable, scenario, season, decade, selected territory with its chart, language, basemap, basin outlines), so a link sent to a colleague opens exactly the same map and chart; demo: build a view → copy the link → open it on the phone / in another browser. Contrast with the old site, where every view has to be clicked together again.

Additions since the plan was written, also worth a line in the deck: "Additional information" (citation, sources, model table, glossary) carried over from the old site, basemap choice + river basin outlines, CSV/PNG export of charts and the map, readability changes (colour curve, borders, one radius system).

**Done when (CP7):** the user has read the package and run the demo script; ready to show to the institute.

## Risks

| Risk | Response |
| --- | --- |
| The institute redeploys the old site and the chunk layout changes | chunk copies and sha256 stay in `data-raw/manifest.json`; the script finds data by field signature, not by name |
| The `place` field does not match what the API expects → 500 | smoke requests for all layers in P1; if in doubt, read `place` from the old site’s network requests |
| The key is revoked or the API changes | key only in `.env.local`; a new key = edit the file and redeploy; fixtures in P6 show what changed |
| The key is visible in the built JS on github.io | same as on the institute’s site today, permission granted; never in the main branch; the gh-pages branch holds only built files |
| Commits or the repo end up under Innate Instruments | local `git config` and personal SSH alias / `gh auth`; author checked at CP0 |
| Simplification distorts small hromadas | visual check at CP2; fallback PMTiles |
| Safari / iPhone not tested | known gap, stated in the presentation; WebGL memory with hromadas + grid is the main thing to check there later |
| CARTO basemap terms on another domain | check before a public demo; the basemap is swappable via config |
| Extracted data not verified against the source | check with the data owner after their return; until then the demo is marked “prototype” |

## Open questions

- [x] Personal GitHub login and repo name — `DPanarin/uhmi-climate`, https://dpanarin.github.io/uhmi-climate/
- [ ] Legend scale kept 1:1, or also show an alternative?
- [x] Who runs the dev server — the user, in WebStorm; Claude checks pages in the user's Chrome
- [ ] Data owner’s review of the extracted values after returning from leave
