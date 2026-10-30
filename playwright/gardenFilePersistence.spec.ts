import {
  openPlanSessionDrawer,
  setupAuthenticatedGarden,
  waitForMainApp,
} from './helpers';
import { expect, test } from './test';

test('edit map scale, save, reload — plan restores from server', async ({ page }) => {
  await setupAuthenticatedGarden(page);
  await page.goto('/guilds');
  await waitForMainApp(page);

  await page.getByRole('button', { name: 'Map settings' }).click();
  await page.getByLabel('Map scale').fill('77');
  await openPlanSessionDrawer(page);
  await expect(
    page
      .getByRole('dialog', { name: 'Plan' })
      .locator('strong', { hasText: 'My garden' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.reload();
  await waitForMainApp(page);

  await openPlanSessionDrawer(page);
  await expect(
    page
      .getByRole('dialog', { name: 'Plan' })
      .locator('strong', { hasText: 'My garden' }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Map settings' }).click();
  await expect(page.getByLabel('Map scale')).toHaveValue('77');
});
