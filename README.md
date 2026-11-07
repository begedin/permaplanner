# permaplanner

A garden planner with permaculture undertones

## Development

### Toolchain

Node, Erlang, and Elixir versions are pinned in [`.tool-versions`](.tool-versions). Install them with asdf:

```bash
npm run install:toolchain
```

On macOS this switches the asdf Erlang plugin to [prebuilt binaries](https://github.com/michallepicki/asdf-erlang-prebuilt-macos) and bootstraps Hex/Rebar for the Phoenix app.

PostgreSQL builds from source. On macOS, install Xcode Command Line Tools and the Homebrew build dependencies first:

```bash
xcode-select --install # Only if Command Line Tools are not already installed
brew install icu4c openssl@3 pkg-config
```

After installing the toolchain, install the application dependencies and the browser used by end-to-end tests:

```bash
npm ci
mix deps.get
npx playwright install chromium
```

Run `npm run dev:plain` to initialize the local databases and start development without 1Password secrets.

### Tests

```bash
bash scripts/ensure-postgres.sh
npm run test:unit
npm run type-check
mix test
npm run test:e2e
```

Stop the development server before running end-to-end tests: Playwright starts its own Phoenix server with the test database and SQL sandbox.

Secrets for local dev (when needed) live in `.env.1password` — see [`.env.1password.example`](.env.1password.example).

### Running locally

| Command                     | What it runs                                                               |
| --------------------------- | -------------------------------------------------------------------------- |
| `npm run dev`               | Phoenix (8080) + Vite dev server (5173), with 1Password env                |
| `npm run dev:plain`         | Same, without `op run`                                                     |
| `npm run start`             | Production-like Phoenix only on 8080 (requires `npm run build-only` first) |
| `npm run start:server:test` | ExUnit tests for the Phoenix app                                           |

**Use http://localhost:5173 for frontend work.** Vite serves the Vue app with HMR and proxies `/api` to Phoenix.

**http://localhost:8080** is the Phoenix server directly. The UI is only served from a built `dist/` folder (no HMR), so it may be missing or stale unless you've run `npm run build-only`. For a full production-like stack on 8080, use `npm run start` instead.

### Database (local)

Phoenix expects the **asdf** Postgres instance from [`.tool-versions`](.tool-versions) on **port 5434** (so it does not clash with other local Elixir apps on 5432). Default credentials are in [`config/dev.exs`](config/dev.exs).

`npm run dev` runs [`scripts/ensure-postgres.sh`](scripts/ensure-postgres.sh) first: it starts asdf Postgres on 5434 when needed, runs `mix ecto.setup` when the dev/test databases are missing, and errors if the instance contains unexpected databases.

One-time: if your asdf data directory was previously on 5432, the script rewrites `port` in `$(asdf where postgres)/data/postgresql.conf` and restarts Postgres.

While a migration is still uncommitted, edit that file in place rather than adding a follow-up migration. After changing a migration that was already applied locally, reset and re-run tests:

```bash
mix ecto.reset
MIX_ENV=test mix ecto.reset && mix test
```

See [`.cursor/skills/ecto-migrations/SKILL.md`](.cursor/skills/ecto-migrations/SKILL.md) for the full workflow.

### Deploy to Fly

```bash
npm run deploy:fly
```

Runtime secrets on Fly:

- `SECRET_KEY_BASE` (64+ bytes): `fly secrets set SECRET_KEY_BASE="$(mix phx.gen.secret)"`
- `DATABASE_URL` — set automatically by `fly postgres attach permaplanner-db -a permaplanner`

After setting secrets, deploy them: `fly secrets deploy -a permaplanner` (Fly may show secrets as “Staged” until you do).

Postgres on Fly uses the private network (`*.flycast`). The app sets `ECTO_IPV6=true` in `fly.toml` so Ecto can connect (without it you get `nxdomain` on migrate/boot).

Migrations run on deploy via `release_command` in [`fly.toml`](fly.toml).

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
   - **`cultivars`**: array of `{ "id", "name" }` (and optionally `name_latin`, `defaultIconId`, `functions`, `layers`, `blooming`, `harvest` to override species defaults). Cultivar **`id`** must be unique within that species.
   - **`blooming`** / **`harvest`** (optional on species or cultivar): `{ "start": 1–12, "end": 1–12 }` for calendar months; if `start` > `end`, the range wraps across the year (see `formatMonthPeriod` in `plantCatalog.ts`). On a **cultivar** only: omit the field to inherit the species value; set **`null`** to clear that aspect (e.g. species has a harvest period but this cultivar does not).
3. **Validate**: ensure the file parses as JSON (your editor usually does this). Run `npx vitest run src/plantCatalog.test.ts` if you changed phenology or want a quick sanity check.
4. **Types**: `plantCatalog.ts` types should match the JSON shape; if you add new top-level fields, update the TypeScript types there as well.

Runtime resolution and labels are implemented in [`src/resolvePlant.ts`](src/resolvePlant.ts) and [`src/plantCatalog.ts`](src/plantCatalog.ts).

### Catalog correction sources (0.25.14)

- Snowball viburnum: [Illinois Extension](https://web.extension.illinois.edu/hortanswers/plantdetail.cfm?PlantID=463&PlantTypeID=8) identifies 'Roseum' as sterile and fruitless.
- Raspberry harvest overrides: [Heritage](https://www.provendernurseries.co.uk/product/rubus-idaeus-heritage-raspberry-b5) and [Fallgold](https://larchcottage.co.uk/product/rubus-idaeus-fallgold-3-canes/) nursery descriptions give August–October. These are approximate UK outdoor autumn-crop windows; local climate and double-cropping can change timing.
- Comfrey: RHS identifies [Bocking 14](https://www.rhs.org.uk/plants/108577/symphytum-%C3%97-uplandicum-bocking-14/details) and [Bocking 4](https://www.rhs.org.uk/plants/373279/symphytum-%C3%97-uplandicum-bocking-4/details) as _Symphytum × uplandicum_.
- White Lisbon onion: [RHS](https://www.rhs.org.uk/plants/112442/allium-cepa-white-lisbon/details) identifies _Allium cepa_.
- Birch: [RHS](https://www.rhs.org.uk/plants/birch/how-to-grow-birch) identifies river and paper birch; [University of Connecticut](https://plantdatabase.uconn.edu/detail.php?pid=64) identifies sweet birch.
- Lord Baltimore hibiscus: [Wisconsin Extension](https://hort.extension.wisc.edu/articles/hibiscus-lord-baltimore/) describes its hybrid ancestry and herbaceous growth.
- Miss Kim lilac: [RHS](https://www.rhs.org.uk/plants/119023/syringa-pubescens-subsp-patula-miss-kim/details) identifies _Syringa pubescens subsp. patula_.
- Paperwhite narcissus: [RHS](https://www.rhs.org.uk/plants/74758/narcissus-papyraceus/details) identifies _Narcissus papyraceus_.

### Catalog addition sources (0.26.1)

- White spruce December: [licensed grower PT-Potcultures](https://www.pt-potcultures.nl/picea-glauca-december/).
- Greater snowdrop: [RHS species profile](https://www.rhs.org.uk/plants/7556/galanthus-elwesii/details), with [January–February flowering](https://futureforests.ie/en-gb/products/galanthus-elwesii).
- False spirea Crimson Feather: [Concept Plants](https://conceptplants.com/varieties/sorbaria-sorbifolia-crimson-feather-hyfaria) identifies the cultivar name as 'Hyfaria'.
- Plums: [National Fruit Collection — Mirabelle de Nancy](https://www.nationalfruitcollection.org.uk/full2.php?fruit=plum&id=8223), [Van den Berk — Opal](https://www.vdberk.co.uk/trees/prunus-domestica-opal/), and [Artevos — Topend Plus](https://fruitattraction.german-pavilion.com/en/sites/products-services/235897). Topend Plus has a September–October harvest override.
- Lilacs: [RHS — Madame Lemoine](https://www.rhs.org.uk/plants/lilac/large-flowered-lilacs) and [International Lilac Society cultivar register](https://www.internationallilacsociety.org/wp-content/uploads/2021/03/ILS-register-update-March-5-2021.pdf). The register places Lavender Lady under Syringa × hyacinthiflora.
- Sea buckthorn: [Augustinka nursery listing](https://puskajapensas.fi/tuotteet/monivuotiset-taimet/marjakasvit/tyrnit/tyrni-augustinka) and [Oregon State University](https://landscapeplants.oregonstate.edu/plants/hippophae-rhamnoides) for nitrogen fixation.
- Hybrid mahonia Winter Sun: [Provender Nurseries](https://www.provendernurseries.co.uk/factsheets/mahonia-x-media-winter-sun) gives November–March flowering.
- Flowering quince Salmon Horizon: [RHS](https://www.rhs.org.uk/plants/154370/chaenomeles-%C3%97-superba-salmon-horizon/details).
- Firethorn Sunny Star and related Star cultivars: [RHS breeder account](https://www.rhs.org.uk/plants/new-plants/pyracantha-orange-star) and [Sunny Star nursery listing](https://www.primaflora.hr/vatreni-trn--sunny-star/).
- Dappled willow Hakuro-Nishiki: [RHS](https://www.rhs.org.uk/plants/66597/salix-integra-hakuro-nishiki-v/details).
- Broom Luna: [Minier nursery](https://www.pepinieres-minier.fr/en/produit/cytisus-scoparius-luna). Broom groups several Cytisus cultivars, with botanical names attached to individual cultivars.

Month ranges are approximate outdoor northern-hemisphere seasons and vary with climate.

## Badges

[![codecov](https://codecov.io/gh/begedin/permaplanner/graph/badge.svg?token=EG2DRHVP86)](https://codecov.io/gh/begedin/permaplanner)

## Garden document format

Stored documents, API responses, frontend state, and downloadable JSON use the
merged guild format (version 6). `syncRevision` tracks save conflicts.
Create, update, and import prepare validated document fields and parsed image changes
through `Permaplanner.Gardens.Document` before opening a transaction. Saves lock the garden row and require the expected
revision before atomically updating the document and background image.
Each plant instance in a guild can have an optional `note`, displayed beneath the
plant. Notes are preserved in saves and JSON imports/exports; older documents
without plant notes remain valid without a backfill.

Before sending JSON to `/api/legacy-import/local`, the frontend file importer checks
for `guildLocations`, joins geometry to guilds and plant instances by ID, and
renames instance `name` to `nameOrCultivar`. The backend then imports the current
format. Other historical field conversions are not
supported. Version 5 imports gain an empty landmark list and an unspecified scale unit.
The version 6 data migration applies the same conversion atomically to saved gardens
while preserving revisions and geometry. For this single-user app, save before deploying,
avoid editing during deployment, and reload afterward before saving again.

## MCP: connect an AI assistant

The Phoenix app serves a read-only MCP endpoint at `/mcp`, using stateless
Streamable HTTP with JSON responses. It supports protocol versions `2025-11-25`,
`2025-06-18`, and `2025-03-26`. There is no separate service or paid OAuth provider.

Available tools:

- `list_gardens()` returns the signed-in user's garden IDs, names, revisions, and update times.
- `get_garden_context({gardenId})` returns all saved guilds and resolved plants,
  including notes, vigor, growth phases, mulch, geometry, and map scale.
- `get_guild({gardenId, guildId})` returns one guild with resolved plants and map scale.
- `search_plant_catalog({query, offset?, limit?})` searches species/cultivars and
  catalog traits. Terms are case-insensitive and ANDed; an empty query browses.
  `limit` defaults to 20 (maximum 50); use `nextOffset` until it is null.

Tool responses include both JSON `structuredContent` and a JSON text block.
Plants resolve in the same order as the frontend: catalog species, species overrides,
catalog cultivar, cultivar overrides. Bloom/harvest periods inherit from species
unless the cultivar overrides or clears them. A missing plant reference is `null`.
Map coordinates use drawing units, calibrated by `mapScale`; the physical unit is
user-chosen and is not stored. Background image bytes and UI preferences are omitted.
Reads always use the latest server-saved document; unsynced browser edits are unavailable.
The catalog is compiled from `src/data/plantCatalog.json` and included in releases.

### Server configuration

1. Apply the migration with `mix ecto.migrate` (Fly releases run migrations normally).
2. Set `MCP_BASE_URL` to the app's public HTTPS origin, without a path, for example
   `https://your-permaplanner.example`. Local development defaults to `http://localhost:4000`.
3. The public OAuth client registrations live in `config/config.exs` and ship with
   the app. The configured client IDs are:

   | Application              | Client ID    |
   | ------------------------ | ------------ |
   | ChatGPT                  | `chatgpt`    |
   | Claude                   | `claude`     |
   | Cursor                   | `cursor`     |
   | VS Code / GitHub Copilot | `vscode`     |
   | Gemini CLI               | `gemini-cli` |

   These are public clients: leave the client secret blank. All clients must use
   authorization-code flow with S256 PKCE. Gemini CLI must set `oauth.redirectUri`
   to `http://localhost:7777/oauth/callback` to match its registered callback.
   Register additional clients or update exact callback URLs in `config/config.exs`
   and redeploy. Registration does not establish end-to-end client compatibility;
   verify the connection in each client after deployment.

   If a future client requires a secret, load it from deployment secrets in
   `config/runtime.exs`; never commit it. Confidential clients may use
   `client_secret_post` or `client_secret_basic`.

4. Restart or redeploy the app after changing the public origin. On this deployment,
   use `MCP_BASE_URL=https://permaplanner.bego.dev` and connect clients to
   `https://permaplanner.bego.dev/mcp` consistently, even though the app also has a
   Fly hostname.

### Connecting and revoking access

In the AI application's custom MCP connection settings, enter
`https://your-permaplanner.example/mcp`, select OAuth, and configure your registered
client ID and optional secret. In Claude, select **Use your own OAuth client**.
This initial implementation uses explicit client registration; automatic registration
and client ID metadata documents are not implemented.

The assistant discovers authorization endpoints through `/.well-known/oauth-protected-resource`
and `/.well-known/oauth-authorization-server`. It must request the resource
`https://your-permaplanner.example/mcp` during authorization and token exchange,
with scope `gardens:read`.

The authorization page reuses your existing Permaplanner account. If not already
signed in, open the sign-in link, complete login and two-factor authentication,
then return to the authorization tab and select **I've signed in — continue**.
Approve read access to finish connecting. Enable the connector in your conversation
and ask the assistant to fetch current garden context before answering.

Visit `/oauth/connections` while signed in to revoke a connection. Authorization
codes expire after five minutes, access tokens after at most one hour, and connections
require renewed consent after 30 days. Refresh tokens rotate; replaying an old
refresh token revokes that connection. Credentials are hashed in Postgres and are
separate from browser session tokens. OAuth consent and revocation forms enforce CSRF.

Connections and credentials are stored separately. Token expiry never exceeds the
connection's remaining lifetime. Expired connections and credentials are pruned
when a new authorization starts; maintenance can also call
`Permaplanner.MCP.Credentials.prune_expired/0` through a release RPC. Consumed refresh
tokens remain indexed until expiry so replay still revokes the connection.

The shared `test/fixtures/plant_resolution.json` contract is checked by both ExUnit
and Vitest to keep backend and frontend plant resolution aligned. Catalog search
indexes only names, IDs, roles, and layers, excluding JSON field names and icon metadata.

MCP calls require bearer credentials, including catalog searches. Cross-origin
browser requests are rejected by default; server-to-server clients normally omit
`Origin`. If necessary, configure `:mcp_allowed_origins` with exact trusted origins.
This implementation does not provide SSE subscriptions, legacy HTTP+SSE transport,
or write tools. Hosted ChatGPT/Claude connections still need an end-to-end check
after deploying and registering their actual callback URLs.

### Map units and landmarks

Map settings lets you choose meters, feet, centimeters, inches, or yards for the
reference line's entered length. Changing the unit labels that length; it does not
convert the number or alter map geometry. New gardens use meters. Older gardens
keep an unspecified unit until you choose the unit used to calibrate their scale.

Choose **Draw landmark (R)** and drag a rectangle on the aerial map. Select it to
name it, drag it to move, drag the round handle to rotate, or drag any edge or corner
to resize while keeping the opposite side fixed. You can also enter a rotation in degrees.
Escape cancels a gesture; landmark edits support undo/redo and JSON export/import.

Landmarks store an ID, name, centre (`x`, `y`), width, height, and clockwise
rotation in degrees. Dimensions use map coordinates. Both garden and guild MCP
responses include all landmarks, the scale unit, and coordinate conventions.
North is unknown; image up does not imply geographic north.

### Read-only admin dashboard

Open `/admin` directly after signing in and completing TOTP. There is no admin
link in the app. Unauthorized requests return a plain 404 without a login redirect. The Phoenix LiveView dashboard
lists existing users and gardens, with totals, email/name search, and pagination.
It does not change stored data or expose garden documents or authentication secrets.
A persistent **Admin · Read only** banner distinguishes it from the planner.

Set `ADMIN_USER_IDS` to a comma-separated list of existing user UUIDs in the server
environment before starting the app. An empty value denies all access. With no
environment value, access defaults to none; development can supply a local default
in ignored `config/dev.exs.local`:

```elixir
import Config
config :permaplanner, :admin_user_ids, ["your-local-user-uuid"]
```

This file is only loaded in development. `ADMIN_USER_IDS` overrides it, including
an explicitly empty value. Restart the local Phoenix server after changing it.
Find your UUID with an Ecto query in a trusted local or release console:

```elixir
import Ecto.Query
Permaplanner.Repo.one(from u in Permaplanner.Accounts.User,
  where: u.email == ^"your-email@example.com", select: u.id)
```

For example, start locally with `ADMIN_USER_IDS=your-user-uuid npm run dev:plain`,
then sign in and open `/admin` on the Vite origin. Both Vite development and preview
proxy admin HTTP requests and the LiveView WebSocket to Phoenix. Production uses
`MCP_BASE_URL` as the canonical public origin for Phoenix's URL and WebSocket origin
check; use that same origin to visit the dashboard.

Authorization is checked on the HTTP request, connected LiveView mount, searches,
and live navigation. Logging out or removing access prevents further data reads
from an open dashboard; it cannot erase data already displayed in a browser.
Totals and rows are refreshed on navigation/search or a page reload, not pushed
when other users change their gardens. Environment changes require a server restart;
production restarts and deployments require explicit approval.
