---
name: data-format-migration
description: >-
  Changes persisted plan data (local .json file or GitHub plans/ shards).
  Use when editing PermaplannerFile shape, parsePermaplannerDocument,
  permaplannerFileMigrate, githubRepoSync push/pull, or fixtures with
  version / plants / guilds / config. Requires bumping PERMAPLANNER_FILE_VERSION
  and adding a migrate step plus tests.
---

# Plan data format migrations (permaplanner)

Read this skill **before** changing anything users save to disk or GitHub.

## Two persistence shapes (same logical version)

| Shape | Location | `version` field |
| --- | --- | --- |
| **Monolithic** | Local plan `.json` (File System Access API) | Top-level `version` on the whole document |
| **GitHub shards** | `plans/<garden>/config.json`, `plants.json`, `guilds.json` | `version` on **each** JSON file (`config` already had it; `plants` / `guilds` must stay in sync) |

Current version constant: `PERMAPLANNER_FILE_VERSION` in [`src/permaplannerFileVersion.ts`](../../src/permaplannerFileVersion.ts).

## When you change the schema

1. **Bump** `PERMAPLANNER_FILE_VERSION` (e.g. `2` → `3`).
2. **Add a migration step** as its own module (default export `MigrateStep`), registered in the matching `loaders.ts` (dynamic `import()` — only steps actually needed are loaded):
   - Monolithic plan: new file `src/migrations/plan/v{n}ToV{n+1}.ts`, register in [`src/migrations/plan/loaders.ts`](../../src/migrations/plan/loaders.ts) at index *from* version (e.g. `2: () => import('./v2ToV3')`).
   - `plants.json` only: `src/migrations/plantsShard/v{n}ToV{n+1}.ts` + [`plantsShard/loaders.ts`](../../src/migrations/plantsShard/loaders.ts).
   - `guilds.json` only: `src/migrations/guildsShard/v{n}ToV{n+1}.ts` + [`guildsShard/loaders.ts`](../../src/migrations/guildsShard/loaders.ts).
   - Config shard changes that affect merged plan fields: add to **plan** loaders (config is migrated via `migratePlanDocumentRaw` on pull).
3. **Normalize** in `parsePermaplannerDocument` only for field coercion that is not version-specific (plants via `normalizePlantsFromFile`, guild mulch, etc.) — do not hide version jumps there.
4. **Write** new data at the new version in:
   - `usePermaplannerStore` `snapshot()` (local save)
   - `pushPlanJsonToGithubRepo` (all three shards + config fields)
5. **Tests** in [`src/permaplannerFileMigrate.test.ts`](../../src/permaplannerFileMigrate.test.ts): at least one fixture at version *n−1* (or unversioned for v0) asserting migrated output; run `npm run test:unit src/permaplannerFileMigrate.test.ts` and any `permaplannerFileFlow` / `githubRepoSync` tests you touch.
6. **Fixtures**: update `playwright/fixtures/*.json` if they embed plan JSON.

## Rules

- Never remove or reorder existing migration steps; only append.
- Reject documents with `version` **greater** than `PERMAPLANNER_FILE_VERSION` (user needs a newer app).
- Missing `version` is **0** (`readDocumentVersion`).
- GitHub pull merges shards then calls `parsePermaplannerDocument`; shard helpers `plantsArrayFromShard` / `guildsArrayFromShard` run shard migrations first.

## Checklist (copy for PR / task)

- [ ] `PERMAPLANNER_FILE_VERSION` incremented
- [ ] `src/migrations/.../v{n}ToV{n+1}.ts` added and registered in the right `loaders.ts`
- [ ] Push paths write new `version` on plants/guilds/config
- [ ] Unit test covers old → new
- [ ] Related store / sync tests green
