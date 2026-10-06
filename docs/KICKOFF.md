# Kickoff prompt for the Claude Code session

Paste this as the first message of a new Claude Code session opened in `~/WebstormProjects/uhmi/climate`.

```
You are building a Vue 3 prototype of https://climate.uhmi.org.ua/ for a presentation to the Ukrainian Hydrometeorological Institute.

1. Read CLAUDE.md, then docs/DEV_PLAN.md in full (especially "How to use this plan" and "Reference"), then docs/PROGRESS.md.
2. Reply with a short summary (max 10 lines): your understanding of the goal, the phase order with checkpoints, and anything in the plan that is unclear or contradictory. Do not write code yet.
3. Ask me what you need for P0: my personal GitHub login, the repo name, and whether I or you run the dev server.
4. After my answers, do P0 only, then stop at CP0 with the checkpoint report from CLAUDE.md and wait for my OK.

Rules for the whole project: English, brief; never commit .env.local, the API key or data-raw/; use only my personal GitHub account; unit tests only, no E2E or CI; stop at every checkpoint.
```
