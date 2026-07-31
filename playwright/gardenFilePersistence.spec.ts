import {
  openPlanSessionDrawer,
  setupAuthenticatedGarden,
  waitForMainApp,
} from './helpers';
import { expect, test } from './test';

test('edit map scale, save, reload — plan restores from server', async ({ page }) => {
  await setupAuthenticatedGarden(page);
  await page.goto('/aerial');
  await waitForMainApp(page);

  await openPlanSessionDrawer(page);
  await expect(
    page
      .getByRole('dialog', { name: 'Plan' })
      .locator('strong', { hasText: 'My garden' }),
  ).toBeVisible();

  await page.getByLabel('Map scale').fill('77');
  await page.getByRole('button', { name: 'Save plan' }).click();

  await page.reload();
  await waitForMainApp(page);

  await openPlanSessionDrawer(page);
  await expect(
    page
      .getByRole('dialog', { name: 'Plan' })
      .locator('strong', { hasText: 'My garden' }),
  ).toBeVisible();
  await expect(page.getByLabel('Map scale')).toHaveValue('77');
});
