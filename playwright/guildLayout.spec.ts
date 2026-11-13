import { registerAndReachImport, pasteAerialPhotoOntoMap } from './helpers';
import { importLayoutGarden } from './fixtures/guildLayout';
import { expect, test } from './test';

let browserErrors: string[];
test.beforeEach(async ({ page }) => {
  await registerAndReachImport(page);
  browserErrors = [];
  page.on('console', (message) => {
    if (['warning', 'error'].includes(message.type())) browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(error.message));
});
test.afterEach(() => expect(browserErrors).toEqual([]));

test('draws and saves a placement without changing the individual', async ({ page }) => {
  await importLayoutGarden(page);
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const card = page.getByRole('region', { name: 'Guild details' });
  const place = card.getByRole('button', { name: /^Place .*#1$/ });
  await place.click();
  const box = await map.boundingBox();
  if (!box) throw new Error('Missing layout');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 30, cy, { steps: 6 });
  await page.mouse.up();
  const canopy = map.locator('.canopy');
  await expect(canopy).toHaveCount(1);
  const placement = await canopy.getAttribute('transform');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(canopy).toHaveCount(0);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect(canopy).toHaveAttribute('transform', placement!);
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes('/api/gardens/') &&
        response.request().method() === 'PUT' &&
        response.ok(),
    ),
    page.getByRole('button', { name: 'Save', exact: true }).click(),
  ]);
  await page.reload();
  await expect(canopy).toHaveAttribute('transform', placement!);
  await card.getByRole('button', { name: /^Select .*#1$/ }).click();
  await map.focus();
  await page.keyboard.press('Delete');
  await expect(canopy).toHaveCount(0);
  await expect(card.getByRole('button', { name: /^Select .*#1$/ })).toContainText(
    'Not placed',
  );
  await expect(card.getByRole('button', { name: /^Place / })).toHaveCount(2);
  await expect(card.getByText(/Keep this individual/)).toHaveCount(2);
});

test('switches selection, cancels placement, and resizes immediately after Place', async ({
  page,
}) => {
  await importLayoutGarden(page, { placed: true });
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const card = page.getByRole('region', { name: 'Guild details' });
  const firstPlace = card.getByRole('button', { name: /^Place .*#1$/ });
  const secondPlace = card.getByRole('button', { name: /^Place .*#2$/ });
  const firstSelect = card.getByRole('button', { name: /^Select .*#1$/ });
  const secondSelect = card.getByRole('button', { name: /^Select .*#2$/ });
  await firstPlace.click();
  await secondSelect.click();
  await expect(secondSelect).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  await secondPlace.click();
  await map.getByRole('button', { name: /Select .* on layout/ }).click();
  await expect(firstSelect).toHaveAttribute('aria-pressed', 'true');
  await secondPlace.click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(secondSelect).toHaveAttribute('aria-pressed', 'false');
  await secondPlace.click();
  await secondSelect.click();
  await expect(secondSelect).toHaveAttribute('aria-pressed', 'false');
  await secondPlace.click();
  const box = await map.boundingBox();
  if (!box) throw new Error('Missing layout');
  await page.mouse.click(box.x + box.width / 2 + 70, box.y + box.height / 2);
  await expect(secondSelect).toHaveAttribute('aria-pressed', 'false');
  await expect(map.locator('.canopy')).toHaveCount(1);

  await firstPlace.click();
  const before = await map.locator('.canopy').getAttribute('transform');
  const handle = await map.getByLabel('Resize selected canopy').boundingBox();
  if (!handle) throw new Error('Missing resize handle');
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
  await page.mouse.down();
  await page.mouse.move(handle.x + handle.width / 2 + 20, handle.y + handle.height / 2, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(map.locator('.canopy')).not.toHaveAttribute('transform', before!);
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  const resized = await map.locator('.canopy').getAttribute('transform');
  const canopy = await map.locator('.canopy').boundingBox();
  if (!canopy) throw new Error('Missing canopy');
  await page.mouse.move(canopy.x + canopy.width / 2, canopy.y + canopy.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    canopy.x + canopy.width / 2 + 15,
    canopy.y + canopy.height / 2 + 10,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(map.locator('.canopy')).not.toHaveAttribute('transform', resized!);
  const moved = await map.locator('.canopy').getAttribute('transform');
  expect(moved?.split('scale')[1]).toBe(resized?.split('scale')[1]);
});

test('keeps the same map, card and sidebar through animated navigation', async ({
  page,
}) => {
  await importLayoutGarden(page, { placed: true });
  await page.goto('/guilds/bed');
  await expect(
    page.getByRole('button', { name: 'Map settings', exact: true }),
  ).toBeVisible();
  await pasteAerialPhotoOntoMap(page);
  await expect(page.locator('[data-main-svg] image')).toBeVisible();
  const svg = await page.locator('[data-map-camera]').elementHandle();
  const card = await page
    .getByRole('region', { name: 'Guild details' })
    .getByRole('article')
    .elementHandle();
  const sidebar = await page
    .getByRole('complementary', { name: 'Guild list' })
    .elementHandle();
  const before = await page.locator('[data-map-camera]').getAttribute('viewBox');
  await page.getByRole('button', { name: 'Place plants' }).click();
  await expect(page.locator('[data-view-transition="active"]')).toHaveCount(1);
  await expect(page.locator('[data-view-transition="active"]')).toHaveCount(0);
  await expect(page.getByLabel('Draw plant canopies')).not.toHaveAttribute(
    'viewBox',
    before!,
  );
  expect(await svg?.evaluate((el) => el.isConnected)).toBe(true);
  expect(await card?.evaluate((el) => el.isConnected)).toBe(true);
  expect(await sidebar?.evaluate((el) => el.isConnected)).toBe(true);
  await page.getByRole('link', { name: 'Back to aerial' }).click();
  await expect(page.locator('[data-view-transition="active"]')).toHaveCount(0);
  await expect(page.locator('[data-main-svg]')).toHaveAttribute('viewBox', before!);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goBack();
  await expect(page.getByLabel('Draw plant canopies')).toBeVisible();
  await expect(page.locator('[data-view-transition="active"]')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Draw plant canopies')).toBeInViewport();
  await expect(page.getByRole('link', { name: 'Back to aerial' })).toBeInViewport();
  await page
    .getByRole('complementary', { name: 'Guild list' })
    .getByRole('article', { name: 'Other guild', exact: true })
    .click();
  await expect(page).toHaveURL(/\/guilds\/other\/layout$/);
  await page
    .getByRole('complementary', { name: 'Guild list' })
    .getByRole('article', { name: 'Unmapped guild', exact: true })
    .click();
  await expect(page).toHaveURL(/\/guilds\/unmapped$/);
  expect(await svg?.evaluate((el) => el.isConnected)).toBe(true);
});

test('replaces only planted guild names at maximum aerial zoom', async ({ page }) => {
  await importLayoutGarden(page, { placed: true });
  await page.goto('/guilds/bed');
  const map = page.locator('[data-main-svg]');
  await page.getByRole('button', { name: 'Map settings', exact: true }).click();
  const toggle = page.getByRole('checkbox', { name: 'Plant names (maximum zoom)' });
  await toggle.check();
  await map.dispatchEvent('wheel', {
    ctrlKey: true,
    deltaY: -120,
    clientX: 800,
    clientY: 350,
  });
  await expect(map.locator('[data-plant-label]')).toHaveCount(0);
  await expect(map.getByText('Orchard', { exact: true })).toHaveCount(1);
  await map.dispatchEvent('wheel', {
    ctrlKey: true,
    deltaY: -200,
    clientX: 800,
    clientY: 350,
  });
  await expect(map.locator('[data-plant-label]')).toContainText('Granny Smith');
  await expect(map.getByText('Orchard', { exact: true })).toHaveCount(0);
  await expect(map.getByText('Other guild', { exact: true })).toHaveCount(1);
  await toggle.uncheck();
  await expect(map.locator('[data-plant-label]')).toHaveCount(0);
  await expect(map.getByText('Orchard', { exact: true })).toHaveCount(1);
});

test('legacy placeholders remain unplaced after import and reload', async ({ page }) => {
  await importLayoutGarden(page, { legacy: true });
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  await expect(map).toBeVisible();
  await expect(map.locator('.canopy')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Select .*#1$/ })).toContainText(
    'Not placed',
  );
  await expect(map.locator('.canopy')).toHaveCount(0);
});

test('moves a small selected canopy and resizes it without an initial size jump', async ({
  page,
}) => {
  await importLayoutGarden(page, { placed: true, canopySize: 0.3 });
  await page.goto('/guilds/bed/layout');
  await page.getByRole('button', { name: /^Select .*#1$/ }).click();
  const canopy = page.getByLabel('Draw plant canopies').locator('.canopy');
  await expect(canopy).toBeVisible();
  const before = await canopy.getAttribute('transform');
  const box = await canopy.boundingBox();
  if (!box) throw new Error('Missing canopy');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 10, {
    steps: 6,
  });
  await page.mouse.up();
  await expect(canopy).not.toHaveAttribute('transform', before!);
  const after = await canopy.getAttribute('transform');
  expect(after?.split('scale')[1]).toBe(before?.split('scale')[1]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(canopy).toHaveAttribute('transform', before!);
  const handle = page.getByLabel('Resize selected canopy');
  await handle.click();
  await expect(canopy).toHaveAttribute('transform', before!);
  const handleBox = await handle.boundingBox();
  if (!handleBox) throw new Error('Missing resize handle');
  await page.mouse.move(
    handleBox.x + handleBox.width / 2,
    handleBox.y + handleBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handleBox.x + handleBox.width / 2 + 20,
    handleBox.y + handleBox.height / 2,
    { steps: 6 },
  );
  await page.mouse.up();
  await expect(canopy).not.toHaveAttribute('transform', before!);
  const resized = await canopy.getAttribute('transform');
  expect(resized?.split('scale')[0]).toBe(before?.split('scale')[0]);
});

test('previews plant graphics with the moving guild and restores them on cancellation', async ({
  page,
}) => {
  await importLayoutGarden(page, { placed: true });
  await page.goto('/guilds/bed');
  const map = page.locator('[data-main-svg]');
  await page.getByRole('button', { name: 'Map settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Plant names (maximum zoom)' }).check();
  const canopy = map.locator('.canopy');
  const initial = await canopy.boundingBox();
  if (!initial) throw new Error('Missing canopy');
  await map.dispatchEvent('wheel', {
    ctrlKey: true,
    deltaY: -500,
    clientX: initial.x + initial.width / 2,
    clientY: initial.y + initial.height / 2,
  });
  const label = map.locator('[data-plant-label]');
  await expect(label).toBeVisible();
  await page.getByRole('button', { name: 'Move guild (M)', exact: true }).click();
  const before = await canopy.boundingBox();
  const labelBefore = await label.boundingBox();
  if (!before || !labelBefore) throw new Error('Missing plant graphics');
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    before.x + before.width / 2 + 20,
    before.y + before.height / 2 + 10,
    { steps: 6 },
  );
  await expect
    .poll(async () => (await canopy.boundingBox())?.x)
    .toBeCloseTo(before.x + 20, 0);
  await expect
    .poll(async () => (await label.boundingBox())?.x)
    .toBeCloseTo(labelBefore.x + 20, 0);
  await map.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect.poll(async () => (await canopy.boundingBox())?.x).toBeCloseTo(before.x, 0);
  await expect
    .poll(async () => (await label.boundingBox())?.x)
    .toBeCloseTo(labelBefore.x, 0);
});
