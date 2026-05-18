import { test, expect } from '@playwright/test';
import {
  createNewPlanThroughGate,
  openPlanSessionDrawer,
  pasteAerialPhotoOntoMap,
} from './helpers';

test('onboards', async ({ browser }) => {
  const context = await browser.newContext({
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await context.newPage();
  await page.goto('/aerial');

  await createNewPlanThroughGate(page, 'new.json');

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
  const gridPattern = page.locator('pattern#grid');
  await expect(gridPattern).toHaveAttribute('width', /2\.3\d+/);
  await expect(gridPattern).toHaveAttribute('height', /2\.3\d+/);

  const scaleLine = page.locator('[data-main-svg] line[stroke="red"]');
  await expect(scaleLine).toHaveAttribute('x1', /1[12]\.\d+/);
  await expect(scaleLine).toHaveAttribute('y1', /1[12]\.\d+/);
  await expect(scaleLine).toHaveAttribute('x2', /24[34]\.\d+/);
  await expect(scaleLine).toHaveAttribute('y2', /1[12]\.\d+/);
});
