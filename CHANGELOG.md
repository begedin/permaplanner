# Changelog

## 0.21.4

- [FEATURE] Plan sidebar **Copy guild JSON** copies the public share JSON payload (garden name, guilds, and summary) to the clipboard

## 0.21.3

- [TWEAK] Guild list scrolls to the selected guild on the Aerial and Guilds tabs, including when switching tabs with the same selection

## 0.21.2

- [DB] Removed duplicate Latin from catalog display names (garden sage, nectarine, kidney weed, and several cultivars) where `name_latin` already supplies the binomial

## 0.21.1

- [DB] Added Baby's breath (Gypsophila paniculata) with Starflakes, Bristol Fairy, and Festival Star cultivars
- [DB] Added black chokeberry (Aronia melanocarpa) with Viking, Nero, and McKenzie cultivars

## 0.21.0

- [FEATURE] Sign-in completes 2FA setup when the account has not confirmed TOTP yet (QR code, manual secret, recovery codes)
- [REFACTOR] Plan save coordinator targets Permaplanner cloud only; removed the multi-integration save plug-in layer
- [REFACTOR] Removed persisted local file-handle binding (IndexedDB); JSON import always opens the file picker
- [REFACTOR] Removed GitHub import from the garden setup screen
- [TWEAK] Plan sidebar shows save status inline without a collapsible “Permaplanner cloud” section
- [DB] Dropped `import_source` from gardens; imports are local JSON files only
- [FIX] Autosave stops retrying after a failed save until the next edit or a manual save

## 0.20.3

- [TWEAK] Calendar plant list sorts by total plants, then unique cultivars (both descending)

## 0.20.2

- [FIX] Share links use the current site origin instead of `localhost` in deployed apps

## 0.20.1

- [DB] Added Aurora haskap cultivar; corrected haskap bloom (Apr–May) and fruit (Jun–Jul) calendars for species and existing cultivars (Berry Blue, Indigo Gem, Borealis, Tundra)

## 0.20.0

- [REFACTOR] Phoenix app moved from `server/` to the repo root (`lib/`, `config/`, `priv/`, `test/`, `mix.exs`) so Elixir and frontend share one project directory
- [TWEAK] npm scripts, CI, Dockerfile, and docs run `mix` from the root; merged `.gitignore` for frontend and Elixir build artifacts

## 0.19.0

- [FEATURE] Public garden share links: create from the plan menu, list existing links, revoke when no longer needed
- [FEATURE] Share page at `/share/:id` renders a plain-text guild overview (HTML generated on each request from the saved garden)
- [REFACTOR] GitHub backup sync no longer writes `viewer.html` to the sync repo (sharing is handled by the Phoenix app instead)
- [DB] Postgres `shares` table links a garden to a public share id (no HTML stored in the database)

## 0.18.0

- [TWEAK] Guild cards not placed on the aerial map use a warmer parchment background so they stand out from placed guilds
- [DB] Expanded plant catalog: added jujube, purpletop vervain, snapdragon, sunflower, night-scented stock, bunching onion, hyssop, English lavender, common mallow, watermelon, magnolia, Indian lilac (neem), and fir (Nordmann fir); cultivars Blauhilde (pole bean), Blues (hyssop), Mandala Silver / Berggarten / Purpurascens (garden sage), and Caldesi 2010 (nectarine); optional `name_latin` for search; English-first display names with Latin on species/cultivar only when distinct
- [FIX] Guild list sidebar no longer shows a horizontal scrollbar when plant badge labels are long
- [FEATURE] Replace Node production server with a Phoenix app (GitHub OAuth token proxy and SPA static hosting)
- [REFACTOR] Local dev runs Phoenix and Vite together; Vite proxies `/api` to the Elixir server
- [TWEAK] Phoenix code reloader enabled in dev
- [TWEAK] asdf toolchain (`.tool-versions`, prebuilt Erlang on macOS, `npm run install:toolchain`)
- [TWEAK] README development and deploy notes; CI runs server ExUnit tests
- [FIX] GitHub OAuth proxy forwards GitHub response headers correctly (Req list-valued headers)

## 0.17.0

- [FEATURE] Open an existing garden from GitHub: browse backed-up plans in your sync repo, restore the one you pick, then choose where to save a local copy
- [FIX] GitHub pull restores aerial map data (guild layout, map scale, and background image) instead of guild list content only
- [FIX] Open from GitHub saves locally only and does not re-push to the remote backup while binding the file

## 0.16.0

- [FIX] GitHub save force-updates `main` after each push so branch races no longer fail the ref step; removed pre-push remote timestamp conflict check so the in-app save queue can overwrite the backup tip

## 0.15.0

- [DB] Added service tree (Sorbus domestica) to the catalog
- [DB] Added Josta jostaberry cultivar
- [DB] Added oregano to the catalog
- [DB] Added Meteor sour cherry cultivar
- [DB] Added kiwi and hardy kiwi (kiwiberry) to the catalog
- [DB] Added Judas tree (Cercis siliquastrum) to the catalog
- [FEATURE] Undo and redo for plan edits (guilds, plants, map scale, background opacity, reference line, and related aerial onboarding steps)
- [FEATURE] Undo and Redo buttons in the guild tab header
- [FEATURE] Undo with ⌘Z / Ctrl+Z; redo with ⌘⇧Z / Ctrl+Shift+Z or Ctrl+Y (skipped while typing in a field)
- [TWEAK] Autosave waits 5 seconds after the last edit (leading edge saves soon after editing starts; trailing edge saves again after a pause)

## 0.14.0

- [REFACTOR] Plan save tracking no longer uses a content digest; edits mark all linked destinations unsaved and autosave flushes every linked integration together
- [FIX] GitHub save conflicts compare the remote commit timestamp (loaded when the plan opens, checked before push, kept in memory) instead of retrying branch ref updates to overwrite
- [FIX] GitHub sync no longer stores remote save timestamps in localStorage
- [FIX] "Save plan" always writes the local file and pushes to GitHub when connected, even if nothing changed since the last save
- [TWEAK] Autosave waits 20 seconds after the last edit (leading edge saves soon after editing starts; trailing edge saves again after a pause)
- [FIX] GitHub conflict message directs you to pull remote instead of pushing to overwrite

## 0.13.1

- [DB] Added globe artichoke, leaf celery (Par-Cel), Swiss chard (Rhubarb Chard), kidney weed, white willow, lamb's lettuce, and wild rocket to the catalog
- [DB] Added Geisha Girl calendula and Orange Flame French marigold cultivars

## 0.13.0

- [FEATURE] Privacy statement at `/privacy` (local-first data, GitHub sync, Fly.io hosting, and EEA/UK rights)
- [FEATURE] Privacy links on the plan setup gate and in the plan drawer
- [REFACTOR] Plan save coordinator fans out autosave to linked destinations (local file, GitHub) with per-integration status in the plan drawer
- [FIX] Serialize all plan saves (local file then GitHub, one job at a time) to avoid concurrent GitHub push conflicts
- [FIX] Plan save status uses content digest (baseline on load) so refresh no longer shows false "unsaved" or spurious GitHub pushes
- [FIX] "Save plan" no longer forces a GitHub push when the plan is unchanged; digest matches on-disk export shape
- [FEATURE] Persist aerial onboarding progress in the plan file (and GitHub `config.json`), not browser local storage
- [DB] Plan format v5: `onboardingState` on monolithic saves and config shard; existing plans default to `done`
- [FEATURE] Expandable save destinations in the plan drawer (timestamps, GitHub links, retry on failure)
- [TWEAK] Pin the season calendar to the bottom of guild list cards in browse mode
- [FIX] Size guild list rows to their content instead of stretching cards to fill the viewport
- [FIX] Align Plants, Functions, and Layers section titles with Season and Note on the guild detail card

## 0.12.1

- [TWEAK] Keep ESLint `vue/html-indent` and `vue/html-closing-bracket-newline` enabled; document matching Prettier options in `.prettierrc.mjs` and `eslint.config.mjs` instead of disabling those rules via `eslint-config-prettier`
- [TWEAK] Reformat Vue templates so Prettier and ESLint agree (block content inside wrapped tags; small script helpers for long attributes)
- [REFACTOR] Remove dead code (`isCalendarRoute`, unused Playwright helper) and inline or unexport single-use helpers across app and sync modules
- [REFACTOR] Drop unused `focusSearch` return from search-focus hotkey composable

## 0.12.0

- [DB] Updated Drogana Yellow sweet cherry cultivar name and phenology (late May bloom, late June–early August fruit)
- [DB] Set distinct bloom and fruit calendars for Amaty, Apistar, Carmeliter Reinette, and Francuska kožarka apples
- [DB] Verified sweet and sour cherry cultivar phenology; added overrides where cultivars differ from species defaults
- [DB] Verified apricot cultivar phenology (early Korai piros, late-blooming Tilton/Goldcot, extended Moorpark harvest)
- [FEATURE] Calendar tab: browse garden plants by species with search, cultivar and instance counts, aggregated season calendar, and per-cultivar condition and calendars
- [FEATURE] Search guilds by name, plants, and notes on the Guilds tab (fuzzy match via Fuse.js; name ranked above plants and notes)
- [FEATURE] Highlight matched text in the guild list while searching
- [TWEAK] Focus guild and calendar search with ⌘F / Ctrl+F or `/` (platform-specific hint in the search placeholder)

## 0.11.4

- [FEATURE] Generate a static GitHub Pages guild viewer per garden at `plans/<garden>/viewer.html` (plain-text guild content baked into HTML for LLM-friendly sharing)
- [FEATURE] Link to the GitHub Pages guilds view from the GitHub backup sidebar
- [FIX] Keep the remote backup timestamp after a page refresh
- [FIX] Resolve guild plant names from plant records when saving locally and to GitHub (avoid stale "Plant" labels)

## 0.11.3

- [FEATURE] Per-guild notes in guild details (plain text with line breaks and indentation)

## 0.11.2

- [TWEAK] Explain which private GitHub repo is created or reused when connecting

## 0.11.1

- [FIX] Keep guild selected when refreshing on a `/guilds/:id` or `/aerial/:id` URL

## 0.11.0

- [FEATURE] Icon theme
- [FEATURE] Color theme
- [DB] Added elderberry, asparagus, pole bean, bush bean, and pinks (Dianthus) to the catalog
- [TWEAK] Add/Remove buttons on plants

## 0.10.0

- [FEATURE] Improve card layout, edit plants

## 0.9.0

- [FEATURE] Further layout improvements

## 0.8.0

- [FEATURE] Show guild size in card, iconize buttons, format code, add style skill

## 0.7.1

- [DB] Added Carmeliter Reinette apple cultivar and Loch Ness blackberry cultivar to the catalog
- [FEATURE] Confirmation prompt when deleting guild

## 0.7.0

- [FEATURE] New app layout

## 0.6.0

- [FEATURE] Restructure github json to be more LLM friendly
- [FIX] Syncing to github improvements
- [DB] Added coneflower, viburnum, and aubrieta to the catalog

## 0.5.0

- [FEATURE] Migration support
- [DB] Bunch of new plants added
- [REFACTOR] E2E passes again

## 0.4.3

- [DB] Aprisali appricot
- [DB] Larkspur
- [DB] Goumi

## 0.4.2

- [FIX] Allow cultivar to unset species phenology
- [FEATURE] Add rosehip, ornamental rose, curry plant

## 0.4.1

- [FEATURE] Add thyme to plant catalog
- [FEATURE] Add apistar apple cultivar
- [FEATURE] Add narcisus to database

## 0.4.0

- [FEATURE] App footer session with aggregated blooming and fruiting calendar

- [FEATURE] Use combobox for plant selection

## 0.3.0

### A full revamp of the UI.

- The app is now primarily a guild manager with aerial view and location being secondary.
- Github Sync has been added
- Local save approachg as been improved
- Plant designer has been removed
- Global plant database has been added, with the option of extending locally

## 0.1.0

- [FEATURE] allow adding plants to garden bed
- [REFACTOR] Deduplicate drawing code
