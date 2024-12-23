import { test, expect, Page } from '@playwright/test';
import { onboard } from './helpers';

const createPlant = async (page: Page, name: string) => {
  await page.getByRole('link', { name: 'Plants' }).click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'bg_2' }).click();
  await page.getByRole('button', { name: 'apple', exact: true }).click();
  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
  await page.getByRole('link', { name: 'Garden' }).click();
};

test.describe('drawing features', () => {
  test.use({ contextOptions: { permissions: ['clipboard-read', 'clipboard-write'] } });

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

  test('creates a bed with a plant', async ({ page }) => {
    await page.goto('');
    await onboard(page);
    await createPlant(page, 'Test apple');
    await createPlant(page, 'Test banana');

    await page.getByRole('button', { name: 'Guild' }).click();

    // draw a single stroke and save
    await page.mouse.move(400, 200);
    await page.mouse.down();
    await page.mouse.move(400, 400, { steps: 10 });
    await page.mouse.move(410, 200, { steps: 10 });
    await page.mouse.move(410, 400, { steps: 10 });
    await page.mouse.move(420, 200, { steps: 10 });
    await page.mouse.move(420, 400, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.press('Enter');

    await await expect(page.locator('[data-main-svg] polygon')).toHaveCount(2); // brush and bed;
    await expect(page.getByRole('button', { name: 'New guild' })).toBeVisible();

    await page.getByRole('button', { name: 'Test apple' }).click();

    await page.mouse.move(405, 205);
    await page.mouse.down();
    await page.mouse.move(430, 230);
    await page.mouse.up();

    await expect(page.locator('[data-main-svg] [data-garden-plant]')).toHaveCount(1);

    const apple = await page.locator('[data-main-svg] [data-garden-plant]').elementHandle();
    if (!apple) {
      throw new Error('No apple on canvas');
    }

    const mainSvg = page.locator('[data-main-svg]');

    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('x', /49\.86/);
    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('y', /64\.37/);
    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('height', /9\.30/);
    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('width', /9\.30/);
    await expect(await mainSvg.locator('[data-garden-plant]').boundingBox()).toEqual({
      height: expect.closeTo(25, 1),
      width: expect.closeTo(25, 1),
      x: expect.closeTo(405, 1),
      y: expect.closeTo(205, 1),
    });

    await page.keyboard.press('+++++++++');

    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('x', /49\.86/);
    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('y', /64\.37/);
    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('height', /9\.30/);
    await expect(mainSvg.locator('[data-garden-plant]')).toHaveAttribute('width', /9\.30/);
    await expect(await mainSvg.locator('[data-garden-plant]').boundingBox()).toMatchObject({
      height: expect.closeTo(29.6, 1),
      width: expect.closeTo(29.7, 1),
      x: expect.closeTo(400.3, 1),
      y: expect.closeTo(200.3, 1),
    });

    const currentPoints = await page
      .locator('[data-main-svg] polygon')
      .last()
      .getAttribute('points');

    await page.keyboard.press('Escape');

    // select bed, draw a new stroke, and save
    await page.getByRole('button', { name: 'New guild' }).click();

    await page.mouse.move(600, 400);
    await page.mouse.down();
    await page.mouse.move(400, 500, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.press('Enter');

    await page.getByRole('button', { name: 'New guild' }).click();

    await expect(page.locator('[data-main-svg] polygon')).toHaveCount(2); // brush and bed;
    await expect(page.locator('[data-main-svg] polygon').last().getAttribute('points')).not.toEqual(
      currentPoints,
    );
  });

  test('creates a bed and adds plants from sidebar', async ({ page }) => {
    await page.goto('');
    await onboard(page);
    await createPlant(page, 'Test apple');
    await createPlant(page, 'Test banana');

    await page.getByRole('button', { name: 'Guild' }).click();

    await page.mouse.move(600, 400);
    await page.mouse.down();
    await page.mouse.move(400, 500, { steps: 10 });
    await page.mouse.up();
    await page.keyboard.press('Enter');

    // add 2 plants to the bed via sidebar

    await page.getByRole('button', { name: 'New guild' }).click();
    await page.getByLabel('Plants not in this guild').getByTitle('Test apple').click();
    await page.getByLabel('Plants not in this guild').getByTitle('Test banana').click();
    await expect(
      page.getByLabel('New guild').getByLabel('Plants in this guild').getByLabel('Test apple'),
    ).toHaveCount(1);
    await expect(
      page.getByLabel('New guild').getByLabel('Plants in this guild').getByLabel('Test banana'),
    ).toHaveCount(1);

    // shift delete bed
    await page.keyboard.down('Shift');
    await page.getByRole('button', { name: 'New guild' }).click();
    await page.keyboard.up('Shift');

    await expect(page.locator('[data-main-svg] polygon')).toHaveCount(0); // unselected, so no brush either
    await expect(page.getByRole('button', { name: 'New guild' })).toBeHidden();
  });
});
