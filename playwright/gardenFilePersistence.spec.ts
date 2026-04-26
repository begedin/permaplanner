import { test, expect, type Page } from '@playwright/test';
import { installOpfsPlanFileHandleE2E } from './helpers';

const waitForGardenReady = async (page: Page) => {
  await page.getByRole('button', { name: 'New plan' }).waitFor({ state: 'visible', timeout: 20_000 });
};

test('new plan, edit map scale, save, reload — plan and map scale restore', async ({ page }) => {
  await installOpfsPlanFileHandleE2E(page);
  await page.goto('/garden');
  await waitForGardenReady(page);

  await page.getByRole('button', { name: 'New plan' }).click();
  await expect(page.getByRole('button', { name: 'Save plan' })).toBeVisible();
  await expect(page.getByText('e2e-plan.json', { exact: true })).toBeVisible();

  await page.getByLabel('Map scale').fill('77');
  await page.getByRole('button', { name: 'Save plan' }).click();

  await page.reload();
  await waitForGardenReady(page);

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
