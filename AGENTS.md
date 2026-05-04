# Agent notes (permaplanner)

## Plant catalog

To add or edit plants, follow [README — Adding plants to the catalog](README.md#adding-plants-to-the-catalog). Source of truth: `src/data/plantCatalog.json`; allowed `functions` / `layers` values: `src/gardenTypes.ts`.

## Skills (Cursor and Claude Code)

- **Cursor** loads skills from `.cursor/skills/<name>/SKILL.md`.
- **Claude Code** loads the same `SKILL.md` shape from `.claude/skills/<name>/` ([docs](https://code.claude.com/docs/en/skills)).
- They do **not** read each other’s folders. The **canonical** text is [`.cursor/skills/vitest-testing-style/SKILL.md`](.cursor/skills/vitest-testing-style/SKILL.md). [`.claude/skills/vitest-testing-style/SKILL.md`](.claude/skills/vitest-testing-style/SKILL.md) is a short pointer that tells the agent to read the canonical file.

## Unit tests (Vitest)

- Run: `npm run test:unit` (optional path: `npm run test:unit path/to/file.test.ts`). One-off CI-style run: `npx vitest run path/to/file.test.ts`.
- Prefer **`toMatchObject` / `toEqual`** (and expected objects/constants) over many per-field `expect`s and `arr[0]!` access.
- Full conventions: [`.cursor/skills/vitest-testing-style/SKILL.md`](.cursor/skills/vitest-testing-style/SKILL.md) (Claude Code: stub under `.claude/skills/…` that points there).

## Keeping tests in sync with code changes

Cursor loads [`.cursor/rules/test-maintenance.mdc`](.cursor/rules/test-maintenance.mdc) (**always apply**): after edits under `src/`, locate related `*.test.ts`, run them, and update expectations when the product change is intentional. Wrapper components that only delegate should stay lightly tested; put detailed behavior on the shared module tests.
