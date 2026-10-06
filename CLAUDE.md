# Climate Viewer prototype (UHMI) — instructions for Claude Code

A Vue 3 rebuild of https://climate.uhmi.org.ua/ for a presentation to the Ukrainian Hydrometeorological Institute.
**The full plan is `docs/DEV_PLAN.md`. Read it before any work.** Current status lives in `docs/PROGRESS.md`.

## Working rules

1. Work phase by phase, P0 → P10, in order. Before a phase, re-read its section and the "Reference" section of the plan.
2. **Stop at every checkpoint (CP0–CP7)** using the report template below, then wait for the user's explicit "OK".
   Do not start the next phase without it; fix requested changes first.
3. Update `docs/PROGRESS.md` at every checkpoint and whenever a decision changes the plan.
4. Verify live: the user runs `npm run dev` in WebStorm (http://localhost:5173/uhmi-climate/); Claude does not start it.
   After each visible change, check the page in the user's real Chrome via Claude in Chrome (360, 768, 1366, 1440 px)
   and the console. Firefox for the P7 pass. No Safari.
5. Ask instead of guessing when the old site or API differs from the plan, when a choice changes scope,
   or when a phase runs more than 50% over its estimate.
6. Keep it simple: unit tests (Vitest) only, no E2E, no CI, deploy = `npm run deploy`.
7. Talk to the user in English, briefly (saves tokens). Code, comments and commit messages in English.
   UI text only via `src/i18n/{uk,en}`. The presentation package (P10) is in Ukrainian.

## Checkpoint report template

```
CP<N> — <phase(s)>
Done: …
See it: <localhost / github.io URL, command>
Please check: <from the plan's checkpoint table>
Deviations and limitations: …
Waiting for your OK to start <next phase>.
```

## Secrets and git

- API key: only in `.env.local` as `VITE_API_KEY` (git-ignored). Never in tracked files, commit messages or logs.
  `.env.example` lists the variable names without values.
- `data-raw/` is git-ignored (downloaded third-party bundles and intermediate GeoJSON).
- Git identity: the user's **personal** GitHub account **DPanarin** (`panarin.de@gmail.com`), set locally in this repo.
  Remote: `github.com/DPanarin/uhmi-climate` (public). Pages: https://dpanarin.github.io/uhmi-climate/
- **PanarinD is NOT the personal account.** Plain `git@github.com` SSH on this Mac authenticates as PanarinD, and
  `github.com-corp` is the company key — never use either for this repo. Never push to an Innate Instruments account.
- **Claude only commits; the user pushes and runs `npm run deploy` themselves** (HTTPS remote, signed in as DPanarin).
  Claude never runs `git push` or `npm run deploy`.
- No Claude attribution anywhere in git: no `Co-Authored-By` trailers, no "Generated with Claude" lines.
- API etiquette: smoke checks stay under ~100 sequential requests per run; no loops over all features.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173/uhmi-climate/ (run by the user in WebStorm) |
| `npm test` | Vitest unit tests (`vitest run`) |
| `npm run lint` | oxlint + ESLint + Prettier check (no auto-fix; `npm run format` writes) |
| `npm run data:extract` | P1: download old-site chunks → `data-raw/`, validation report, API smoke check |
| `npm run data:build` | P2: simplified geometry, value files, search index, size report → `public/data/` |
| `npm run data:check` | P9: value parity, built files vs extracted source |
| `npm run deploy` | build + publish `dist/` to the `gh-pages` branch (GitHub Pages) |

## Environment notes

- Node 22. Global npm 10.9 crashes on install (arborist `edgesOut` bug); use `npx -y npm@11 install …` or upgrade npm.
- Scaffolded by create-vue: Vite 8, Vue 3.5, Pinia 4, vue-router 5, Vitest 4, TypeScript 6, MapLibre GL 6.

## Conventions

- Vue 3 Composition API with `<script setup lang="ts">`, TypeScript strict.
- Layout: `scripts/` (data pipeline), `public/data/` (built data), `src/{api,map,stores,components,i18n,config,analytics}`.
- Components read and write Pinia stores; the layer catalogue `src/config/layers.ts` is the only place that knows
  individual layers.
- Unit tests next to the code as `*.spec.ts`. Recorded API responses for tests live in `src/api/__fixtures__/`.
- UI primitives: Reka UI (headless) + our own CSS tokens; icons from `lucide-vue-next`. No heavy UI kit.
- Map: MapLibre GL; colours via `feature-state`, never by rebuilding layers.

## Quick facts (details in the plan's "Reference" section)

- API base `https://api.uhmi.org.ua/`, GET `/projections` and `/historical_observations`;
  params `kind`, `place`, `value_type`, `rcp` (repeated), `season` (omit for annual), `key`.
- API quirks: unknown `place` → 500 HTML; values are strings; seasonal observation series are unsorted;
  no gzip and no cache headers. CORS is open, so the browser calls the API directly.
- Old site data: GeoJSON object literals inside webpack chunks; find them by field signature, never by chunk hash.
  Parse with acorn; never execute the downloaded JS.
