import { test, expect } from '@playwright/test';
test.describe('plant creator', () => {
  test('creates a plant', async ({ page }) => {
    await page.goto('');
    await page.getByRole('link', { name: 'Plants' }).click();

    await page.getByRole('button', { name: 'bg_2' }).click();
    await page.getByRole('button', { name: 'apple' }).click();

    await page.mouse.move(500, 300);
    await page.mouse.down();
    await page.mouse.move(550, 350);
    await page.mouse.up();

    await page.getByLabel('Name').click();
    await page.getByLabel('Name').fill('Apple');
    await page.getByRole('button', { name: 'Create' }).click();

    await expect(page.getByRole('button', { name: /Apple/ })).toBeVisible();
  });
});
