# UHMI Climate Viewer — Vue 3 prototype

Prototype rebuild of [climate.uhmi.org.ua](https://climate.uhmi.org.ua/) on Vue 3 + MapLibre GL.

- Plan: [`docs/DEV_PLAN.md`](docs/DEV_PLAN.md) · progress: [`docs/PROGRESS.md`](docs/PROGRESS.md)
- Presentation package and handover notes (Ukrainian): [`docs/presentation/`](docs/presentation/)
- Live: https://dpanarin.github.io/uhmi-climate/

## Setup

```sh
npm install
cp .env.example .env.local   # fill in VITE_API_KEY (never commit it)
npm run dev                  # http://localhost:5173/uhmi-climate/
# responsive check (dev only): http://localhost:5173/uhmi-climate/dev/viewports.html
```

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | dev server |
| `npm test` | unit tests (Vitest) |
| `npm run lint` | oxlint + ESLint + Prettier check |
| `npm run data:extract` | P1: extract map data from the old site |
| `npm run data:build` | P2: build map data into `public/data/` |
| `npm run data:check` | P9: value parity, built files vs extracted source |
| `npm run deploy` | build and publish `dist/` to the `gh-pages` branch |
