import { test, expect } from '@playwright/test';
import { onboard } from './helpers';

test('creates a plant', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto('');
  await onboard(page);

  await page.getByRole('button', { name: 'Plant Creator' }).click();
  await page.getByRole('button', { name: 'bg_2' }).click();
  await page.getByRole('button', { name: 'apple' }).click();

  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.mouse.move(550, 350);
  await page.mouse.up();

  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill('Apple');
  await page.getByRole('button', { name: 'Create' }).click();

  await page.getByTitle('Apple').click();

  await page.mouse.move(500, 500);
  await page.mouse.down();
  await page.mouse.move(550, 550);
  await page.mouse.up();

  await expect(page.locator('[data-thing-bar]').getByText('Apple')).toBeVisible();

  await expect(page.locator('[data-main-svg] [data-garden-plant]')).toHaveCount(1);

  const apple = await page.locator('[data-main-svg] [data-garden-plant]').elementHandle();
  if (!apple) {
    throw new Error('No apple on canvas');
  }

  const mainSvg = page.locator('[data-main-svg]');

  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('x', /87\.111/);
  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('y', /177\.7/);
  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('height', /17\.7/);
  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('width', /17\.7/);
  await expect(await mainSvg.locator('[data-garden-plant]').boundingBox()).toEqual({
    height: expect.closeTo(50, 1),
    width: expect.closeTo(50, 1),
    x: expect.closeTo(500, 1),
    y: expect.closeTo(500, 1),
  });

  await page.keyboard.press('+++++++++');

  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('x', /87\.111/);
  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('y', /177\.777/);
  await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('height', /17\.777/);
  await expect(mainSvg.locator(' [data-garden-plant]')).toHaveAttribute('width', /17\.777/);
  await expect(await mainSvg.locator('[data-garden-plant]').boundingBox()).toMatchObject({
    height: expect.closeTo(58.9, 1),
    width: expect.closeTo(58.9, 1),
    x: expect.closeTo(491.1, 1),
    y: expect.closeTo(491.1, 1),
  });
});
