import { test, expect, Page } from '@playwright/test';
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

const createPlant = async (page: Page, name: string) => {
  await page.getByRole('button', { name: 'Plant Creator' }).click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('button', { name: 'bg_2' }).click();
  await page.getByRole('button', { name: 'apple', exact: true }).click();
  await page.getByLabel('Name').click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Create' }).click();
};

test('creates a bed', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  await page.goto('');
  await onboard(page);
  await createPlant(page, 'Test apple');
  await createPlant(page, 'Test banana');

  await page.getByRole('button', { name: 'bed' }).click();

  // draw a single stroke and save
  await page.mouse.move(400, 200);
  await page.mouse.down();
  await page.mouse.move(600, 400, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-main-svg] polygon')).toHaveCount(2); // brush and bed;
  await expect(page.getByRole('button', { name: 'New bed' })).toBeVisible();

  const currentPoints = await page.locator('[data-main-svg] polygon').last().getAttribute('points');

  // select bed, draw a new stroke, and save
  await page.getByRole('button', { name: 'New bed' }).click();
  await page.mouse.move(600, 400);
  await page.mouse.down();
  await page.mouse.move(400, 500, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.press('Enter');

  await expect(page.locator('[data-main-svg] polygon')).toHaveCount(2); // brush and bed;
  await expect(page.locator('[data-main-svg] polygon').last().getAttribute('points')).not.toEqual(
    currentPoints,
  );

  // add 2 plants to the bed

  await page.getByRole('button', { name: 'New bed' }).click();
  await page.getByRole('button', { name: 'Test apple' }).last().click();
  await page.getByRole('button', { name: 'Test banana' }).last().click();
  await expect(page.getByTestId('bed-plants').getByTitle('Test apple')).toHaveCount(1);
  await expect(page.getByTestId('bed-plants').getByTitle('Test banana')).toHaveCount(1);

  // shift delete bed
  await page.keyboard.down('Shift');
  await page.getByRole('button', { name: 'New bed' }).click();
  await page.keyboard.up('Shift');

  await expect(page.locator('[data-main-svg] polygon')).toHaveCount(0); // unselected, so no brush either
  await expect(page.getByRole('button', { name: 'New bed' })).toBeHidden();
});
