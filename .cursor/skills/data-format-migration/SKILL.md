---
name: data-format-migration
description: >-
  Changes persisted garden plan data (server document or downloadable JSON).
  Use when editing GardenDocument / PermaplannerFile shape, parseGardenDocument,
  permaplannerFileMigrate, or fixtures with version / plants / guilds / config.
  Requires bumping PERMAPLANNER_FILE_VERSION and adding a migrate step plus tests.
---

# Plan data format migrations (permaplanner)

Read this skill **before** changing anything users save to the server or export as JSON.

## Persistence shapes (same logical version)

| Shape | Location | `version` field |
| --- | --- | --- |
| **Server document** | Postgres gardens API (`document` JSON) | Top-level `version` on the whole document |
| **Downloadable JSON** | Local export / share / legacy import | Top-level `version` on the whole document |

Current version constant: `PERMAPLANNER_FILE_VERSION` in [`src/permaplannerFileVersion.ts`](../../src/permaplannerFileVersion.ts).

In-memory and server snapshots use merged `Guild[]`. Downloadable JSON may still split guild content vs locations via [`guildPersistence.ts`](../../src/guildPersistence.ts); parse merges them back.

## When you change the schema

1. **Bump** `PERMAPLANNER_FILE_VERSION` (e.g. `2` → `3`).
2. **Add a migration step** as its own module (default export `MigrateStep`), registered in [`src/migrations/plan/loaders.ts`](../../src/migrations/plan/loaders.ts) (dynamic `import()` — only steps actually needed are loaded):
   - New file `src/migrations/plan/v{n}ToV{n+1}.ts`, register at index *from* version (e.g. `2: () => import('./v2ToV3')`).
   - Only the **plan** track exists under `src/migrations/plan/`. Do not add parallel shard loaders.
3. **Normalize** in `parseGardenDocument` / `parsePermaplannerDocument` only for field coercion that is not version-specific (plants via `normalizePlantsFromFile`, guild mulch, etc.) — do not hide version jumps there.
4. **Write** new data at the new version in `usePermaplannerStore` `snapshot()` / `snapshotForServer()`.
5. **Tests** in [`src/permaplannerFileMigrate.test.ts`](../../src/permaplannerFileMigrate.test.ts): at least one fixture at version *n−1* (or unversioned for v0) asserting migrated output; run `npx vitest run src/permaplannerFileMigrate.test.ts` and any `permaplannerFileFlow` / export tests you touch.
6. **Server:** keep Elixir `Garden.current_file_version` (or equivalent) aligned when the version constant changes.
7. **Fixtures**: update `playwright/fixtures/*.json` if they embed plan JSON.

## Rules

- Never remove or reorder existing migration steps; only append.
- Reject documents with `version` **greater** than `PERMAPLANNER_FILE_VERSION` (user needs a newer app).
- Missing `version` is **0** (`readDocumentVersion`).
- Legacy import runs plan migrations then `parseGardenDocument`.

## Checklist (copy for PR / task)

- [ ] `PERMAPLANNER_FILE_VERSION` incremented
- [ ] `src/migrations/plan/v{n}ToV{n+1}.ts` added and registered in `plan/loaders.ts`
- [ ] Snapshot / server save paths write the new `version`
- [ ] Unit test covers old → new
- [ ] Related migrate / export / legacy-import tests green
