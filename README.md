# permaplanner

A garden planner with permaculture undertones

## Development

### Toolchain

Node, Erlang, and Elixir versions are pinned in [`.tool-versions`](.tool-versions). Install them with asdf:

```bash
npm run install:toolchain
```

On macOS this switches the asdf Erlang plugin to [prebuilt binaries](https://github.com/michallepicki/asdf-erlang-prebuilt-macos) and bootstraps Hex/Rebar for the Phoenix app.

Secrets for local dev (GitHub OAuth) live in `.env.1password` — see [`.env.1password.example`](.env.1password.example).

### Running locally

| Command                     | What it runs                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`               | Phoenix (8080) + Vite dev server (5173), with 1Password env                |
| `npm run dev:plain`         | Same, without `op run`                                                     |
| `npm run start`             | Production-like Phoenix only on 8080 (requires `npm run build-only` first) |
| `npm run start:server:test` | ExUnit tests for `server/`                                                 |

**Use http://localhost:5173 for frontend work.** Vite serves the Vue app with HMR and proxies `/api` to Phoenix.

**http://localhost:8080** is the Phoenix server directly. The OAuth token proxy (`POST /api/github/oauth/access_token`) works here. The UI is only served from a built `dist/` folder (no HMR), so it may be missing or stale unless you've run `npm run build-only`. For a full production-like stack on 8080, use `npm run start` instead.

GitHub OAuth redirect URIs are origin-specific. Local dev typically uses `http://localhost:5173/guilds`; add `http://localhost:8080/guilds` too if you test the full flow on 8080.

### Deploy to Fly

```bash
npm run deploy:fly
```

Build-time: `VITE_GITHUB_CLIENT_ID` (via `.env.fly` and 1Password). Runtime secret on Fly: `GITHUB_CLIENT_SECRET`. See [`scripts/fly-deploy-op.sh`](scripts/fly-deploy-op.sh).

## Adding plants to the catalog

The editable plant list lives in [`src/data/plantCatalog.json`](src/data/plantCatalog.json). The app imports it as static data; there is no separate database server.

1. **Open** `src/data/plantCatalog.json` and add a new object to the `species` array (keep the JSON valid: commas between entries, no trailing comma on the last field).
2. **Species fields** (see types in [`src/plantCatalog.ts`](src/plantCatalog.ts)):
   - **`id`**: stable snake_case identifier (e.g. `sweet_william`). Must be unique among all species.
   - **`name`**: display name shown in the UI (common English; see [adding-to-db skill](.cursor/skills/adding-to-db/SKILL.md)).
   - **`name_latin`** (optional): Latin binomial for search; omit when ambiguous or uncertain.
   - **`defaultIconId`**: hand-drawn icon id for the species default (see `PLANT_ICON_IDS` in [`src/plantIcons/iconIds.ts`](src/plantIcons/iconIds.ts)).
   - **`functions`**: array of guild roles. Allowed values are exactly those in [`GuildFunction`](src/gardenTypes.ts) (`nitrogen_fixer`, `dynamic_accumulator`, `pollinator_attractor`, `pest_repellent`, `ground_cover`, `wildfire_suppressor`, `mulcher`, `edible`, `medicinal`).
   - **`layers`**: vertical niche tags. Allowed values are in [`GuildLayer`](src/gardenTypes.ts) (`overstory`, `understory`, `shrub`, `ground_cover`, `vine`, `herb`, `root`).
   - **`cultivars`**: array of `{ "id", "name" }` (and optionally `name_latin`, `defaultIconId`, `functions`, `layers`, `blooming`, `fruiting` to override species defaults). Cultivar **`id`** must be unique within that species.
   - **`blooming`** / **`fruiting`** (optional on species or cultivar): `{ "start": 1–12, "end": 1–12 }` for calendar months; if `start` > `end`, the range wraps across the year (see `formatMonthPeriod` in `plantCatalog.ts`). On a **cultivar** only: omit the field to inherit the species value; set **`null`** to clear that aspect (e.g. species fruits but this cultivar does not).
3. **Validate**: ensure the file parses as JSON (your editor usually does this). Run `npx vitest run src/plantCatalog.test.ts` if you changed phenology or want a quick sanity check.
4. **Types**: `plantCatalog.ts` types should match the JSON shape; if you add new top-level fields, update the TypeScript types there as well.

Runtime resolution and labels are implemented in [`src/resolvePlant.ts`](src/resolvePlant.ts) and [`src/plantCatalog.ts`](src/plantCatalog.ts).

## Badges

[![codecov](https://codecov.io/gh/begedin/permaplanner/graph/badge.svg?token=EG2DRHVP86)](https://codecov.io/gh/begedin/permaplanner)
