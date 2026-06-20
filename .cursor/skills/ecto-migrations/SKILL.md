---
name: ecto-migrations
description: >-
  Ecto schema migrations for the Phoenix server (server/priv/repo/migrations).
  Use when adding or changing database tables/columns, editing migration files,
  or resetting the test DB after an in-place migration edit.
---

# Ecto migrations (permaplanner server)

Migrations live under [`server/priv/repo/migrations/`](../../server/priv/repo/migrations/). Schema modules live in [`server/lib/permaplanner/`](../../server/lib/permaplanner/).

## Edit in place vs add a new file

| Situation | What to do |
| --- | --- |
| Migration is **uncommitted** (not on `main`, not deployed) | **Edit the existing file** — do not add a second migration to fix the first |
| Migration is **committed** or already applied on staging/production | **Add a new migration** with `mix ecto.gen.migration …` — never rewrite history |

Example: if `create_shares` is still only on your branch, drop a column by editing that file directly instead of adding `remove_html_from_shares`.

## After editing a migration in place

Replay the schema from scratch locally and in test:

```bash
cd server && mix ecto.reset
cd server && MIX_ENV=test mix ecto.reset
cd server && mix test
```

`mix test` runs `ecto.create` + `ecto.migrate` via the Mix alias, but that only helps when migrations match what Postgres already has. If you changed a file that was already migrated, **reset first** or tests will fail with column/table mismatches.

## Day-to-day commands

```bash
# First-time / dev DB
cd server && mix ecto.create && mix ecto.migrate

# Drop, recreate, migrate (dev)
cd server && mix ecto.reset

# Test DB only
cd server && MIX_ENV=test mix ecto.reset

# New migration (when history must be preserved)
cd server && mix ecto.gen.migration describe_the_change
```

Default DB names: `permaplanner_dev` (dev), `permaplanner_test` (test) — see [`server/config/dev.exs`](../../server/config/dev.exs) and [`server/config/test.exs`](../../server/config/test.exs).

## Rules

- Keep **one migration per logical schema change** while the work is still uncommitted.
- Update the matching **Ecto schema** (`server/lib/permaplanner/.../*.ex`) in the same change.
- Production deploys run migrations via Fly `release_command` — only **forward** migrations ship there.
- Do not delete or reorder migration files that have shipped.

## Checklist

- [ ] Uncommitted? Edited the original migration instead of adding a fix-up file
- [ ] Schema module matches the migration
- [ ] `MIX_ENV=test mix ecto.reset` then `mix test` after in-place edits
- [ ] Committed/deployed already? New migration file only
