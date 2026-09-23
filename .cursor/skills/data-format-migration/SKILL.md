---
name: data-format-migration
description: Changes persisted garden documents and import compatibility.
---

# Garden document format changes

- The current version lives in `lib/permaplanner/gardens/garden.ex` and
  `src/gardenDocument.ts`. Keep the frontend aligned with the backend.
- Storage, API responses, frontend state, and exports use merged guilds.
- Keep `version` (format) separate from `syncRevision` (save conflicts).
- Handle old file layouts at the frontend file import entry point. The split guild
  compatibility transform belongs in `src/legacyImport/localFile.ts`.
  Do not add frontend migration runners or unrelated historical conversions.
- Only bump the version and add an Ecto data migration when the stored backend
  format changes. Export alignment alone needs no database backfill.
- For database changes, follow `../ecto-migrations/SKILL.md`; preserve revisions,
  metadata, background images, and geometry.
- Test import conversion and current-format round trips; update README and CHANGELOG.
