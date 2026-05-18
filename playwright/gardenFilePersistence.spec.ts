import { test, expect, type Page } from '@playwright/test';
import { installOpfsPlanFileHandleE2E, waitForMainApp } from './helpers';

const waitForPlanRestoredOrSetup = async (page: Page) => {
  const setupHeading = page.getByRole('heading', { name: 'Choose where to save your plan' });
  const restored = page.getByText('e2e-plan.json', { exact: true });
  await Promise.race([
    setupHeading.waitFor({ state: 'visible', timeout: 20_000 }),
    restored.waitFor({ state: 'visible', timeout: 20_000 }),
  ]);
};

test('new plan, edit map scale, save, reload — plan and map scale restore', async ({ page }) => {
  await installOpfsPlanFileHandleE2E(page);
  await page.goto('/aerial');
  await waitForPlanRestoredOrSetup(page);

  if (await page.getByRole('heading', { name: 'Choose where to save your plan' }).isVisible()) {
    await page.getByRole('button', { name: 'Create new plan…' }).click();
    await waitForMainApp(page);
  }

  await expect(page.getByRole('button', { name: 'Save plan' })).toBeVisible();
  await expect(page.getByText('e2e-plan.json', { exact: true })).toBeVisible();

  await page.getByLabel('Map scale').fill('77');
  await page.getByRole('button', { name: 'Save plan' }).click();

  await page.reload();
  await waitForMainApp(page);

  await expect(page.getByText('e2e-plan.json', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Map scale')).toHaveValue('77');

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const root = await navigator.storage.getDirectory();
        const file = await (await root.getFileHandle('e2e-plan.json')).getFile();
        const doc = JSON.parse(await file.text()) as { mapScale?: { linePhysicalLength?: number } };
        return doc.mapScale?.linePhysicalLength;
      }),
    )
    .toBe(77);
});
