import { pasteAerialPhotoOntoMap, setupAuthenticatedGarden } from './helpers';
import { expect, test } from './test';

test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

test('onboards', async ({ page }) => {
  await page.goto('/guilds');

  await setupAuthenticatedGarden(page);
  await page.goto('/guilds');

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

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Map settings' }).click();
  const future = page.getByRole('slider', { name: 'Future view' });
  const help = page.getByRole('button', { name: 'How sizes are estimated' });
  await future.hover();
  const initialPosition = await future.boundingBox();
  await future.press('ArrowRight');
  await expect(future).toHaveValue('1');
  expect(await future.boundingBox()).toEqual(initialPosition);
  await future.press('End');
  await expect(future).toHaveValue('13');
  expect(await future.boundingBox()).toEqual(initialPosition);
  await help.click();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await expect(
    page.getByText('Set the aerial map scale and unit to see plant spreads.'),
  ).toBeVisible();
  await help.click();
  await expect(page.getByText(/Year views estimate canopy growth/)).toBeHidden();
  await page.getByLabel('Reference line length').fill('100');
  await help.click();
  await expect(
    page.getByText('Place a plant on the map to see its future spread.'),
  ).toBeVisible();

  await expect(page.getByRole('dialog', { name: 'Plan' })).toBeHidden();

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
