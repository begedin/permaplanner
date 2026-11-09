# Frozen version 8 guild migration

`guild-boundaries-v8.cjs` is a self-contained Node.js 22 bundle. It reads a JSON
array of guilds from the filename supplied as its sole argument and writes those
guilds with converted paths to stdout. It does not need npm or node_modules.

Source: `scripts/migrate-guild-boundaries-v8.ts` and
`src/legacyImport/guildPath.ts`. Before the migration's first release, regenerate
with `npm run bundle:migration:v8`. Do not regenerate a shipped migration: the
bundled dependency versions and conversion behavior are part of migration history.
The checked-in bundle is formatted generated third-party code, not application code
to edit by hand.

The bundle includes polygon-clipping 0.15.7, robust-predicates 3.0.2, and splaytree
3.1.2. Their licenses are included here, along with the license for the TypeScript
runtime helpers included by splaytree. Shared regression cases live in
`test/fixtures/guild-boundaries-v8.json` and are exercised by both the file importer
and the real database migration tests.
