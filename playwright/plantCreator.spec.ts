import { test, expect } from '@playwright/test';
test.describe('plant creator', () => {
  test('creates a plant', async ({ page }) => {
    await page.goto('');
    await page.getByRole('link', { name: 'Plants' }).click();

    await page.locator('select').first().selectOption('apple');
    await page.getByPlaceholder('Uses catalog name if empty').fill('Apple');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: /Apple/ })).toBeVisible();
  });
});
