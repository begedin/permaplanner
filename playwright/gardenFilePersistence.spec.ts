import { test, expect } from '@playwright/test';
import {
  openPlanSessionDrawer,
  setupAuthenticatedGarden,
  waitForMainApp,
} from './helpers';

test('edit map scale, save, reload — plan restores from server', async ({ page }) => {
  await setupAuthenticatedGarden(page);
  await page.goto('/aerial');
  await waitForMainApp(page);

  await openPlanSessionDrawer(page);
  await expect(page.getByText('My garden', { exact: true })).toBeVisible();

  await page.getByLabel('Map scale').fill('77');
  await page.getByRole('button', { name: 'Save plan' }).click();

  await page.reload();
  await waitForMainApp(page);

  await openPlanSessionDrawer(page);
  await expect(page.getByText('My garden', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Map scale')).toHaveValue('77');
});
