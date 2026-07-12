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

- **`findBy*`** — built-in wait (polls until found or timeout, default **1000ms**). **Prefer** whenever UI appears after a fetch, `watch`, or render tick — for clicks **and** presence checks. Equivalent to `waitFor(() => getBy*(…))`.
- **`getBy*`** — synchronous, no wait. Use only when the element is on screen immediately after `render()` with no intervening async work.
- **`queryBy*`** — returns `null` when absent; use only for “should not be on screen” assertions.

**Do not** assert that a control exists and then query the same control again before interacting:

```ts
// Avoid
await waitFor(() => {
  expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy();
});
await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
```

**Prefer** `findBy*` for async DOM — one query, fails loudly if missing:

```ts
// Async presence
await screen.findByRole('link', { name: shareHref });

// Async click
await fireEvent.click(await screen.findByRole('button', { name: 'Revoke share link …' }));

// Sync click (element is on screen right after render)
await fireEvent.click(screen.getByRole('button', { name: 'Copy guild JSON' }));
```

`await findBy*(…)` is enough on its own — no need to wrap it in `expect(…).toBeTruthy()`.

Reserve `waitFor` for **non-DOM** side effects (mock calls, clipboard, “element removed after action”), not for waiting on elements that `findBy*` can query.

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
