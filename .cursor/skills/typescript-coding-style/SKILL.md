---
name: typescript-coding-style
description: >-
  TypeScript and Vue coding style for this repo: run type-check and Prettier on
  every modified file; avoid extracting tiny single-use helpers. Use when writing
  or editing TypeScript/Vue, tests, or config in this project, or when the user
  asks about formatting, function extraction, or coding style.
---

# TypeScript coding style (permaplanner)

## Format every file you change

**Before finishing a task**, run Prettier on **every file you created or edited** (source, tests, JSON under `src/`, etc.). Do not leave formatting to the user or CI.

```bash
npx prettier --write path/to/File.ts path/to/Other.vue
```

- If all edits are under `src/`, `npm run format` is equivalent (`prettier --write src/`).
- Pass explicit paths when you also changed files outside `src/` (e.g. `playwright/`, root config).
- Run format **after** your edits are complete, then re-read the diff if anything material moved (imports, line breaks).

Formatting is not optional and is part of “done” for any code change.

## Type-check before you finish

**Before finishing a task** that touches TypeScript or Vue, run:

```bash
npm run type-check
```

- Fix every reported error; do not leave type failures for CI (`build` runs `type-check` via `run-p`).
- Re-run after fixes until the command exits 0.
- If you only changed Vitest files under `src/` and they are not in `tsconfig.app.json`, still run `type-check` when you also edited any `.vue` / `.ts` that is part of the app build.

## Do not extract one-off micro-helpers

**Do not** pull logic into a named function when all of the following are true:

- It is only called **once**
- It is **small** (roughly a few lines — lookup + guard, simple map/filter, a single `throw`)
- It does not clarify a **reused** domain concept or shared module API

Keep that logic **inline** in the `computed`, event handler, or caller that needs it.

**Avoid** (single-use wrapper):

```ts
const requireGuild = (guildId: string): Guild => {
  const g = garden.guilds.find((x) => x.id === guildId);
  if (!g) throw new Error(`Guild not found: ${guildId}`);
  return g;
};

const guild = computed((): Guild => requireGuild(props.guildId));
```

**Prefer**:

```ts
const guild = computed((): Guild => {
  const g = garden.guilds.find((x) => x.id === props.guildId);
  if (!g) throw new Error(`Guild not found: ${props.guildId}`);
  return g;
});
```

## When a named function *is* appropriate

Extract or add to a shared module when:

- The same logic is used in **two or more** places
- It is part of a deliberate **module boundary** (e.g. `guildPathBounds.ts`, `resolvePlant.ts`) with tests
- The block is **long or branching** enough that a name genuinely aids reading
- It encodes a **stable domain term** the team will refer to by name

## Vue / Pinia

- Same rule inside `<script setup>`: no file-local `const foo = () => …` that exists only to serve one `computed` or one handler unless it meets the criteria above.
- Prefer existing project modules over new single-use helpers in the same file.
