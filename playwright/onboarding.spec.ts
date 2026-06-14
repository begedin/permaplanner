import { test, expect } from '@playwright/test';
import {
  openPlanSessionDrawer,
  pasteAerialPhotoOntoMap,
  setupAuthenticatedGarden,
} from './helpers';

test('onboards', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  await page.goto('/aerial');

  await setupAuthenticatedGarden(page);
  await page.goto('/aerial');

  await expect(page.locator('[data-onboarding-text]')).toHaveText(
    /Paste an aerial photo/,
  );

  await page.locator('[data-main-svg]').click();
  await pasteAerialPhotoOntoMap(page);

  await expect(page.locator('image')).toBeVisible();

  await expect(page.locator('[data-onboarding-text]')).toHaveText(
    /set the scale of the map/,
  );

  const bbox = await page.locator('image').boundingBox();

  if (!bbox) {
    throw new Error('No image bbox');
  }

  await page.locator('[data-ref-line-start]').hover();
  await page.mouse.down();
  await page.mouse.move(bbox.x + 30, bbox.y + 30);

  await expect(page.locator('[data-onboarding-text]')).toHaveText(/You got it/);

  await page.mouse.up();

  await expect(page.locator('[data-onboarding-text]')).toHaveText(/move the other point/);

  await page.locator('[data-ref-line-end]').hover();
  await page.mouse.down();
  await page.mouse.move(bbox.x + bbox.width - 30, bbox.y + 30);

  await expect(page.locator('[data-onboarding-text]')).toHaveText(/Getting there/);

  await page.mouse.up();

  await expect(page.locator('[data-onboarding-text]')).toHaveText(/set the length/);

  await openPlanSessionDrawer(page);
  await page.getByLabel('Map scale').fill('100');
  await page.keyboard.press('Escape');

  await expect(page.getByRole('dialog', { name: 'Plan and sync' })).toBeHidden();

  await expect(page.locator('rect[fill="url(#grid)"]')).toBeVisible();

  await expect
    .poll(async () =>
      page.evaluate(() => {
        const grid = document.querySelector('pattern#grid');
        const line = document.querySelector('[data-main-svg] line[stroke="red"]');
        if (!grid || !line) {
          return null;
        }
        const gridWidth = Number(grid.getAttribute('width'));
        const gridHeight = Number(grid.getAttribute('height'));
        const x1 = Number(line.getAttribute('x1'));
        const y1 = Number(line.getAttribute('y1'));
        const x2 = Number(line.getAttribute('x2'));
        const y2 = Number(line.getAttribute('y2'));
        const indicatorLengthPx = Math.hypot(x2 - x1, y2 - y1);
        const expectedUnit = indicatorLengthPx / 100;
        const gridMatchesScale =
          gridWidth > 0 &&
          Math.abs(gridWidth - gridHeight) < 1e-6 &&
          Math.abs(gridWidth - expectedUnit) < 1e-6;
        const lineMostlyHorizontal =
          x2 > x1 && Math.abs(y2 - y1) < Math.max(5, indicatorLengthPx * 0.05);
        return gridMatchesScale && lineMostlyHorizontal;
      }),
    )
    .toBe(true);
});
