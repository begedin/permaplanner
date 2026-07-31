import { test as base, expect } from '@playwright/test';

const SANDBOX_HEADER = 'x-phoenix-ecto-sandbox';

/**
 * Each test checks out an Ecto SQL sandbox session so DB writes roll back
 * when the session is deleted (see Phoenix.Ecto.SQL.Sandbox `at: "/sandbox"`).
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const start = await page.context().request.post('/sandbox');
    if (!start.ok()) {
      throw new Error(
        `Failed to start SQL sandbox: ${start.status()} ${await start.text()}`,
      );
    }
    const metadata = await start.text();
    await page.setExtraHTTPHeaders({ [SANDBOX_HEADER]: metadata });
    try {
      await use(page);
    } finally {
      await page.context().request.delete('/sandbox', {
        headers: { [SANDBOX_HEADER]: metadata },
      });
    }
  },
});

export { expect };
