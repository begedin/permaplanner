import type { Page } from '@playwright/test';
import { importLayoutGarden, layoutTest as test } from './fixtures/guildLayout';
import { createEmptyGarden, openPlanSessionDrawer } from './helpers';
import { expect } from './test';

// Each case needs a fresh account and the real API to verify the redirect and request count.
for (const [action, name, openGarden] of [
  ['creation', 'My garden', createEmptyGarden],
  ['import', 'layout', (page: Page) => importLayoutGarden(page, [])],
] as const) {
  test(`opens the editor after ${action} with one list request`, async ({ page }) => {
    let listRequests = 0;
    page.on('request', (request) => {
      const { pathname } = new URL(request.url());
      if (request.method() === 'GET' && pathname === '/api/gardens') {
        listRequests += 1;
      }
    });
    await page.goto('/guilds');
    await expect(page.getByRole('heading', { name: 'Set up your garden' })).toBeVisible();
    expect(listRequests).toBe(1);

    await openGarden(page);
    await openPlanSessionDrawer(page);
    const plan = page.getByRole('dialog', { name: 'Plan' });
    await expect(plan).toContainText(name);
    await expect(plan.getByText(/^Last saved:/)).toHaveText(/Last saved:\s*\d/);
    expect(listRequests).toBe(1);
  });
}
