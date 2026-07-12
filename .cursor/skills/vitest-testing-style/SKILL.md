---
name: vitest-testing-style
description: >-
  Writes and reviews Vitest unit tests in this project using object matchers,
  minimal mocking, and consistent structure. Use when writing or editing
  Vitest tests, reviewing assertions in *.test.ts or *.spec.ts, or when the
  user asks about unit test style.
---

# Vitest testing style (permaplanner)

## Queries and interactions

| Query | Waits? | If missing | Use for |
|-------|--------|------------|---------|
| **`getBy*`** | No | Throws | Inside **`waitFor`** with **`expect`** + jest-dom matchers; or sync UI right after `render()` |
| **`queryBy*`** | No | Returns `null` | **`expect(…).not.toBeInTheDocument()`** (absence) |
| **`findBy*`** | Yes | Throws | **Interactions only** — pass to `fireEvent.click`, etc. Do **not** wrap in `expect` |

There is no async query that returns `null`. **`queryBy*` is not a wait helper** — it is only for asserting something is **not** in the DOM.

**Presence / visibility assertions** — `waitFor` + `getBy*` + jest-dom matcher:

```ts
await waitFor(() => {
  expect(screen.getByRole('dialog', { name: 'Plan and sync' })).toBeVisible();
});

await waitFor(() => {
  expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes');
});
```

**Absence** — `queryBy*` (add `waitFor` when the element disappears after an async action):

```ts
expect(screen.queryByRole('article', { name: 'Alpha guild' })).not.toBeInTheDocument();

await waitFor(() => {
  expect(screen.queryByRole('link', { name: shareHref })).not.toBeInTheDocument();
});
```

Use **`toBeVisible()`** when the user should see the element; **`toBeInTheDocument()`** when DOM presence is enough. Use **`toHaveTextContent`**, **`toHaveAttribute`**, etc. for content or state.

**Avoid** — `findBy*` is self-asserting (throws if not found); do not use it inside `expect`:

```ts
// Avoid — findBy already fails; expect adds nothing useful
expect(await screen.findByRole('dialog', { name: 'Plan and sync' })).toBeVisible();
```

**Clicks** — `findBy*` / `getBy*` directly on the interaction, no separate presence assertion on the same element:

```ts
await fireEvent.click(await screen.findByRole('button', { name: 'Revoke share link …' }));
await fireEvent.click(screen.getByRole('button', { name: 'Copy guild JSON' }));
```

**Do not** `waitFor` a presence check and then query the same control again before clicking:

```ts
// Avoid
await waitFor(() => {
  expect(screen.getByRole('button', { name: 'Save' })).toBeVisible();
});
await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
```

Reserve bare `waitFor` without DOM queries for **non-DOM** side effects (mock calls, clipboard) when no element query is involved.

Vitest loads jest-dom in [`src/testing/vitestSetup.ts`](../testing/vitestSetup.ts).

## Assertions

- Prefer **one structured assertion** over many field-by-field `expect`s, especially on indexed access like `arr[0]!.foo` (avoid non-null `!` for convenience when a matcher can express the same intent).
- Use **`toMatchObject`** when checking that a value includes an expected *subset* of fields (e.g. whole store: `{ fileName, guilds: [guild] }`).
- Use **`toEqual`** when the expected value is fully known and you want **deep equality** (e.g. `expect(x).toEqual([guild])`).
- Reuse **named constants** for expected domain objects in the test (build once, assert against them) so expectations stay aligned with `toMatchObject` / `toEqual`.
- **Avoid** redundant overlapping assertions (e.g. `toHaveLength(1)` plus fully specifying the single element) unless they clarify a distinct failure mode.

**Prefer:**

```ts
expect(reloaded).toMatchObject({
  fileName: fileLabel,
  guilds: [guild],
});
```

**Over:**

```ts
expect(reloaded.guilds).toHaveLength(1);
expect(reloaded.guilds[0]!.id).toBe('g-willow');
// ...
```

## Structure

- Do **not** wrap the **entire** test file in a single `describe` block (individual `it` blocks or targeted `describe`s are fine).
- Keep **mocking** narrow; avoid heavy mocking. Prefer real behavior when practical.
- For Vue: **mock `vue-router`** rather than providing it through globals when routing must be faked.
- For comments: only where non-obvious (e.g. complex mock behavior); skip redundant comments.

## Running tests

- **One-off / agents / CI:** `npm run test:unit` (whole suite) or `npm run test:unit -- src/foo.test.ts` / `src/foo.spec.ts` (single file). Exits when finished.
- **Local dev:** `npm run test:unit:watch` runs `vitest` in **watch mode** (re-runs on save; press `q` to quit). Optional path: `npm run test:unit:watch -- src/foo.test.ts` / `src/foo.spec.ts`.
- In automated shells (Cursor agents, CI), use one-shot commands (`npm run test:unit …` or `npx vitest run …`) and never watch mode.
