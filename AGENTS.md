# Agent notes (permaplanner)

## Plan file format & migrations

Persisted garden data uses a **`version`** field (local `.json` and GitHub `plans/<garden>/{config,plants,guilds}.json`).

**Before changing saved fields or JSON layout:** read [`.cursor/skills/data-format-migration/SKILL.md`](.cursor/skills/data-format-migration/SKILL.md) and follow it (bump `PERMAPLANNER_FILE_VERSION`, add a module under `src/migrations/`, register it in the matching `loaders.ts`, update push/pull and tests). Cursor auto-attaches [`.cursor/rules/data-format-migration.mdc`](.cursor/rules/data-format-migration.mdc) when you edit those paths.

## Postgres / Ecto migrations

**Before adding or changing `priv/repo/migrations/` or Ecto schemas:** read [`.cursor/skills/ecto-migrations/SKILL.md`](.cursor/skills/ecto-migrations/SKILL.md). Uncommitted migrations are edited **in place** (not fixed with a second file). After in-place edits, reset the test DB: `MIX_ENV=test mix ecto.reset`, then `mix test`. Cursor auto-attaches [`.cursor/rules/ecto-migrations.mdc`](.cursor/rules/ecto-migrations.mdc) when you edit migration or schema paths.

## Plant catalog

To add or edit plants, follow [README — Adding plants to the catalog](README.md#adding-plants-to-the-catalog). Source of truth: `src/data/plantCatalog.json`; allowed `functions` / `layers` values: `src/gardenTypes.ts`.

## Skills (Cursor and Claude Code)

- **Cursor** loads skills from `.cursor/skills/<name>/SKILL.md`.
- **Claude Code** loads the same `SKILL.md` shape from `.claude/skills/<name>/` ([docs](https://code.claude.com/docs/en/skills)).
- **Canonical** skills live under `.cursor/skills/`. Claude Code uses a **symlink** to the same file where noted below (single source of truth).
- [vitest-testing-style](.cursor/skills/vitest-testing-style/SKILL.md) — Claude stub at [`.claude/skills/vitest-testing-style/SKILL.md`](.claude/skills/vitest-testing-style/SKILL.md) (pointer text).
- [typescript-coding-style](.cursor/skills/typescript-coding-style/SKILL.md) — Claude stub at [`.claude/skills/typescript-coding-style/SKILL.md`](.claude/skills/typescript-coding-style/SKILL.md) (pointer text).
- [data-format-migration](.cursor/skills/data-format-migration/SKILL.md) — Claude symlink at [`.claude/skills/data-format-migration/SKILL.md`](.claude/skills/data-format-migration/SKILL.md).
- [ecto-migrations](.cursor/skills/ecto-migrations/SKILL.md) — Postgres schema migrations; Claude symlink at [`.claude/skills/ecto-migrations/SKILL.md`](.claude/skills/ecto-migrations/SKILL.md). Cursor auto-attaches [`.cursor/rules/ecto-migrations.mdc`](.cursor/rules/ecto-migrations.mdc) when you edit those paths.
- [writing-endpoints](.cursor/skills/writing-endpoints/SKILL.md) — Phoenix controllers, router, `*_html.ex` (inline `~H"""`, no `.heex` files), ErrorJSON, ConnCase tests. Claude stub at [`.claude/skills/writing-endpoints/SKILL.md`](.claude/skills/writing-endpoints/SKILL.md). Cursor auto-attaches [`.cursor/rules/writing-endpoints.mdc`](.cursor/rules/writing-endpoints.mdc) when you edit those paths.

## Unit tests (Vitest)

- **Agents / one-off runs (exit when done):** `npm run test:unit -- path/to/file.test.ts` — or the whole suite: `npm run test:unit`.
- **Local dev (watch mode):** `npm run test:unit:watch` runs bare `vitest` and stays open until you quit.
- Prefer **`toMatchObject` / `toEqual`** (and expected objects/constants) over many per-field `expect`s and `arr[0]!` access.
- **DOM:** `waitFor` + `getBy*` + jest-dom `expect` for async presence; `queryBy*` + `not.toBeInTheDocument()` for absence; `findBy*` only for `fireEvent` targets (not inside `expect`). Other `waitFor` for non-DOM side effects (mocks, clipboard).
- Full conventions: [`.cursor/skills/vitest-testing-style/SKILL.md`](.cursor/skills/vitest-testing-style/SKILL.md) (Claude Code: stub under `.claude/skills/…` that points there).

## Keeping tests in sync with code changes

Cursor loads [`.cursor/rules/test-maintenance.mdc`](.cursor/rules/test-maintenance.mdc) (**always apply**): after edits under `src/`, locate related `*.test.ts`, run them, and update expectations when the product change is intentional. Wrapper components that only delegate should stay lightly tested; put detailed behavior on the shared module tests.
