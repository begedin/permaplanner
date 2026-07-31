import type { Page } from '@playwright/test';

import { onboard } from './helpers';
import { expect, test } from './test';

const bedPolygons = (page: Page) =>
  page.locator('[data-main-svg] polygon.pointer-events-fill');

const drawBrushStroke = async (page: Page, points: { x: number; y: number }[]) => {
  const [first, ...rest] = points;
  if (!first) {
    throw new Error('drawBrushStroke requires at least one point');
  }
  await page.mouse.move(first.x, first.y);
  await page.mouse.down();
  for (const point of rest) {
    await page.mouse.move(point.x, point.y, { steps: 8 });
  }
  await page.mouse.up();
  await page.keyboard.press('Enter');
};

const selectGuildAndEditBrush = async (page: Page, articleIndex: number) => {
  await page.getByRole('article', { name: 'New guild' }).nth(articleIndex).click();
  await page.getByRole('button', { name: 'Edit brush (B)' }).click();
  await expect(page.getByRole('button', { name: 'Edit brush (B)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
};

test.describe('drawing features', () => {
  test.use({
    viewport: { width: 1280, height: 720 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });

  test('creates and edits guild beds on the aerial map', async ({ page }) => {
    await page.goto('/aerial');
    await onboard(page);

    await page.getByRole('link', { name: 'Guilds' }).click();
    await page.getByRole('button', { name: 'Add guild' }).click();
    await page.getByRole('link', { name: 'Aerial' }).click();

    await selectGuildAndEditBrush(page, 0);
    await drawBrushStroke(page, [
      { x: 400, y: 200 },
      { x: 400, y: 400 },
      { x: 410, y: 200 },
      { x: 410, y: 400 },
      { x: 420, y: 200 },
      { x: 420, y: 400 },
    ]);

    await expect(bedPolygons(page)).toHaveCount(1);
    await expect(page.getByRole('article', { name: 'New guild' }).first()).toBeVisible();

    await page.getByRole('link', { name: 'Guilds' }).click();
    await page.getByRole('button', { name: 'Add guild' }).click();
    await page.getByRole('link', { name: 'Aerial' }).click();

    await selectGuildAndEditBrush(page, 1);
    await drawBrushStroke(page, [
      { x: 600, y: 400 },
      { x: 400, y: 500 },
    ]);

    await expect(bedPolygons(page)).toHaveCount(2);

    const currentPoints = await bedPolygons(page).last().getAttribute('points');

    await selectGuildAndEditBrush(page, 1);
    await drawBrushStroke(page, [
      { x: 500, y: 300 },
      { x: 520, y: 350 },
    ]);

    await expect(bedPolygons(page)).toHaveCount(2);
    await expect(bedPolygons(page).last()).not.toHaveAttribute(
      'points',
      currentPoints ?? '',
    );
  });
});
