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

  await page.getByRole('button', { name: 'Map settings' }).press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('checkbox', { name: 'Plants (max. zoom)' })).toBeFocused();
  const scale = page.getByRole('group', { name: 'Scale', exact: true });
  const length = scale.getByRole('slider', { name: /^Reference line length/ });
  const unit = scale.getByRole('combobox', { name: 'Unit', exact: true });
  await length.fill('77');
  await length.press('Tab');
  await expect(unit).toBeFocused();
  await unit.selectOption('ft');
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
  await expect(length).toHaveValue('77');
  await expect(unit).toHaveValue('ft');
});
