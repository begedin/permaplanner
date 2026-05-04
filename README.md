# permaplanner

A garden planner with permaculture undertones

## Adding plants to the catalog

The editable plant list lives in [`src/data/plantCatalog.json`](src/data/plantCatalog.json). The app imports it as static data; there is no separate database server.

1. **Open** `src/data/plantCatalog.json` and add a new object to the `species` array (keep the JSON valid: commas between entries, no trailing comma on the last field).
2. **Species fields** (see types in [`src/plantCatalog.ts`](src/plantCatalog.ts)):
   - **`id`**: stable snake_case identifier (e.g. `sweet_william`). Must be unique among all species.
   - **`name`**: display name shown in the UI.
   - **`defaultEmoji`**: single emoji for the species default.
   - **`functions`**: array of guild roles. Allowed values are exactly those in [`GuildFunction`](src/gardenTypes.ts) (`nitrogen_fixer`, `dynamic_accumulator`, `pollinator_attractor`, `pest_repellent`, `ground_cover`, `wildfire_suppressor`, `mulcher`, `edible`, `medicinal`).
   - **`layers`**: vertical niche tags. Allowed values are in [`GuildLayer`](src/gardenTypes.ts) (`overstory`, `understory`, `shrub`, `ground_cover`, `vine`, `herb`, `root`).
   - **`cultivars`**: array of `{ "id", "name" }` (and optionally `defaultEmoji`, `functions`, `layers`, `blooming`, `fruiting` to override species defaults). Cultivar **`id`** must be unique within that species.
   - **`blooming`** / **`fruiting`** (optional on species or cultivar): `{ "start": 1–12, "end": 1–12 }` for calendar months; if `start` > `end`, the range wraps across the year (see `formatMonthPeriod` in `plantCatalog.ts`).
3. **Validate**: ensure the file parses as JSON (your editor usually does this). Run `npx vitest run src/plantCatalog.test.ts` if you changed phenology or want a quick sanity check.
4. **Types**: `plantCatalog.ts` types should match the JSON shape; if you add new top-level fields, update the TypeScript types there as well.

Runtime resolution and labels are implemented in [`src/resolvePlant.ts`](src/resolvePlant.ts) and [`src/plantCatalog.ts`](src/plantCatalog.ts).

## Badges

[![codecov](https://codecov.io/gh/begedin/permaplanner/graph/badge.svg?token=EG2DRHVP86)](https://codecov.io/gh/begedin/permaplanner)

