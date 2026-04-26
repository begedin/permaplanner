# Agent notes (permaplanner)

## Skills (Cursor and Claude Code)

- **Cursor** loads skills from `.cursor/skills/<name>/SKILL.md`.
- **Claude Code** loads the same `SKILL.md` shape from `.claude/skills/<name>/` ([docs](https://code.claude.com/docs/en/skills)).
- They do **not** read each other’s folders. The **canonical** text is [`.cursor/skills/vitest-testing-style/SKILL.md`](.cursor/skills/vitest-testing-style/SKILL.md). [`.claude/skills/vitest-testing-style/SKILL.md`](.claude/skills/vitest-testing-style/SKILL.md) is a short pointer that tells the agent to read the canonical file.

## Unit tests (Vitest)

- Run: `npm run test:unit` (optional path: `npm run test:unit path/to/file.test.ts`).
- Prefer **`toMatchObject` / `toEqual`** (and expected objects/constants) over many per-field `expect`s and `arr[0]!` access.
- Full conventions: [`.cursor/skills/vitest-testing-style/SKILL.md`](.cursor/skills/vitest-testing-style/SKILL.md) (Claude Code: stub under `.claude/skills/…` that points there).
