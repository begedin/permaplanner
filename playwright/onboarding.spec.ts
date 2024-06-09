import { test, expect } from '@playwright/test';
import { pasteImage } from './helpers';

test('onboards', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto('');

  await expect(page.locator('[data-onboarding-text]')).toHaveText(/Paste an aerial photo/);

  await pasteImage(page);
  await page.keyboard.press('Meta+v');
  await expect(page.locator('image')).toBeVisible();

  await expect(page.locator('[data-onboarding-text]')).toHaveText(/set the scale of the map/);

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

  await page.getByLabel('Map scale').fill('100');

  await expect(page.locator('text', { hasText: '100' })).toBeVisible();

  await expect(page.locator('rect[fill="url(#grid)"]')).toBeVisible();
  await expect(page.locator('pattern#grid')).toBeAttached();
  const gridPattern = await page.locator('pattern#grid').elementHandle();
  if (!gridPattern) {
    throw new Error('No grid pattern');
  }

  await expect(await gridPattern.getAttribute('width')).toMatch(/2\.346/);
  await expect(await gridPattern.getAttribute('height')).toMatch(/2\.346/);

  await expect(page.locator('line')).toBeAttached();
  const line = await page.locator('line').elementHandle();
  if (!line) {
    throw new Error('No line element');
  }
  await expect(await line.getAttribute('x1')).toMatch(/10\.666/);
  await expect(await line.getAttribute('y1')).toMatch(/10\.666/);
  await expect(await line.getAttribute('x2')).toMatch(/245\.33/);
  await expect(await line.getAttribute('y2')).toMatch(/10\.666/);
});
