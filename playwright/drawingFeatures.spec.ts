import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

test.describe('drawing features', () => {
  test.use({ contextOptions: { permissions: ['clipboard-read', 'clipboard-write'] } });

  test('creates and edits guild beds on the aerial map', async ({ page }) => {
    await page.goto('');
    await onboard(page);

    await page.getByRole('link', { name: 'Guilds' }).click();
    await page.getByRole('button', { name: 'Add guild' }).click();
    await page.getByRole('link', { name: 'Aerial' }).click();

    await page.getByRole('button', { name: 'Select on aerial map' }).click();

    await page.mouse.move(400, 200);
    await page.mouse.down();
    await page.mouse.move(400, 400, { steps: 10 });
    await page.mouse.move(410, 200, { steps: 10 });
    await page.mouse.move(410, 400, { steps: 10 });
    await page.mouse.move(420, 200, { steps: 10 });
    await page.mouse.move(420, 400, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-main-svg] polygon')).toHaveCount(2);
    await expect(page.getByRole('article', { name: 'New guild' }).first()).toBeVisible();

    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Select on aerial map' }).click();

    await page.mouse.move(600, 400);
    await page.mouse.down();
    await page.mouse.move(400, 500, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.press('Enter');

    await page.getByRole('link', { name: 'Guilds' }).click();
    await page.getByRole('button', { name: 'Add guild' }).click();
    await page.getByRole('link', { name: 'Aerial' }).click();

    await page.getByRole('button', { name: 'Select on aerial map' }).nth(1).click();

    const currentPoints = await page
      .locator('[data-main-svg] polygon')
      .last()
      .getAttribute('points');

    await page.mouse.move(500, 300);
    await page.mouse.down();
    await page.mouse.move(520, 350, { steps: 8 });
    await page.mouse.up();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-main-svg] polygon')).toHaveCount(2);
    await expect(
      page.locator('[data-main-svg] polygon').last().getAttribute('points'),
    ).not.toEqual(currentPoints);
  });
});
