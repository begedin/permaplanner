import { registerAndReachImport, pasteAerialPhotoOntoMap } from './helpers';
import {
  createGrannySmiths,
  createLayoutPlant,
  createStrawberry,
  importLayoutGarden,
} from './fixtures/guildLayout';
import { expect, test } from './test';

const appleCanopy = { x: 40, y: 40, diameter: 20 };

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
  await importLayoutGarden(page, [createGrannySmiths()]);
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const card = page.getByRole('region', { name: 'Guild details' });
  const place = card.getByRole('button', { name: /^Place .*#1 —/ });
  await place.click();
  const box = await map.boundingBox();
  if (!box) throw new Error('Missing layout');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const canopy = map.locator('.canopy');
  await page.mouse.move(cx + 30, cy - 1);
  const upperPreview = await canopy.evaluate((element) => {
    const matrix = (element as SVGGraphicsElement).getScreenCTM()!;
    return { x: matrix.e - matrix.a, y: matrix.f - matrix.d };
  });
  expect(upperPreview.x).toBeCloseTo(cx, 0);
  expect(upperPreview.y).toBeCloseTo(cy, 0);
  await page.mouse.move(cx - 1, cy + 30);
  const leftPreview = await canopy.evaluate((element) => {
    const matrix = (element as SVGGraphicsElement).getScreenCTM()!;
    return { x: matrix.e - matrix.a, y: matrix.f - matrix.d };
  });
  expect(leftPreview.x).toBeCloseTo(cx, 0);
  expect(leftPreview.y).toBeCloseTo(cy, 0);
  await page.mouse.move(cx + 30, cy, { steps: 6 });
  await page.mouse.up();
  await expect(canopy).toHaveCount(1);
  const geometry = await canopy.evaluate((element) => {
    const matrix = (element as SVGGraphicsElement).getScreenCTM()!;
    return { x: matrix.e - matrix.a, y: matrix.f - matrix.d, width: matrix.a * 2 };
  });
  expect(geometry.x).toBeCloseTo(cx, 0);
  expect(geometry.y).toBeCloseTo(cy, 0);
  expect(geometry.width).toBeCloseTo(30, 0);
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
  await canopy.dragTo(map);
  await expect(canopy).not.toHaveAttribute('transform', placement!);
  const moved = await canopy.getAttribute('transform');
  const plan = page.getByRole('button', { name: /^Plan(?:, unsaved changes)?$/ });
  await plan.click();
  const drawer = page.getByRole('dialog', { name: 'Plan' });
  await expect(drawer.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(drawer.getByRole('link', { name: 'Privacy' })).toBeFocused();
  await page.keyboard.press('Delete');
  await page.keyboard.press('ControlOrMeta+z');
  await page.keyboard.press('Escape');
  await expect(plan).toBeFocused();
  await expect(canopy).toHaveAttribute('transform', moved!);
  await page.keyboard.press('ControlOrMeta+z');
  await expect(canopy).toHaveAttribute('transform', placement!);
  await plan.click();
  await drawer
    .getByRole('button', { name: 'Close', exact: true })
    .press('ControlOrMeta+Shift+z');
  await page.keyboard.press('Escape');
  await expect(plan).toBeFocused();
  await expect(canopy).toHaveAttribute('transform', placement!);
  await page.keyboard.press('ControlOrMeta+Shift+z');
  await expect(canopy).toHaveAttribute('transform', moved!);
  await map.focus();
  await page.keyboard.press('Delete');
  await expect(canopy).toHaveCount(0);
  await expect(card.getByRole('button', { name: /^Place .*#1 —/ })).toHaveAttribute(
    'title',
    'Not placed',
  );
  await expect(card.getByRole('button', { name: /^Place / })).toHaveCount(2);
  await expect(card.getByText(/Keep this individual/)).toHaveCount(2);
});

test('accepts a canopy centered inside when its starting corner is outside', async ({
  page,
}) => {
  await importLayoutGarden(page, [createGrannySmiths()]);
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const boundary = map.locator('path[fill-rule="evenodd"][stroke="#42613b"]');
  const box = await boundary.boundingBox();
  if (!box) throw new Error('Missing guild boundary');
  await page.getByRole('button', { name: /^Place .*#1 —/ }).click();
  await page.mouse.move(box.x - 10, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + box.height / 2 + 40);
  await page.mouse.up();
  await expect(map.locator('.canopy')).toHaveCount(1);

  await page.getByRole('button', { name: /^Place .*#2 —/ }).click();
  await page.mouse.move(box.x - 30, box.y + box.height / 3);
  await page.mouse.down();
  await page.mouse.move(box.x - 10, box.y + box.height / 3 + 20);
  await page.mouse.up();
  await expect(map.locator('.canopy')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText(
    'Keep the plant center inside the guild boundary.',
  );
});

test('previews future spreads on both maps and saves a nursery width', async ({
  page,
}) => {
  await importLayoutGarden(page, [
    createGrannySmiths(appleCanopy),
    createStrawberry({ x: 70, y: 70, diameter: 13 }),
  ]);
  await page.goto('/guilds/bed');
  const settings = page.getByRole('group', { name: 'Map settings' });
  const toggle = settings.getByRole('button', { name: 'Map settings' });
  const time = settings.getByRole('slider', { name: 'Future view' });
  const spreads = page.getByLabel('Estimated plant spreads');
  const outline = spreads.getByLabel('Granny Smith', { exact: true });
  const strawberry = spreads.getByLabel(/^Strawberry\b/);
  const map = page.locator('svg[data-map-camera]');
  const measure = map.locator('[data-map-measure]');
  const apple = map.getByRole('button', { name: 'Granny Smith', exact: true });
  const berry = map.getByRole('button', { name: /^Strawberry/ });
  await expect(page.getByRole('slider', { name: 'Future view' })).toBeHidden();
  await toggle.click();
  await expect(time).toHaveValue('0');
  await expect(settings.getByText('Off', { exact: true })).toBeVisible();
  await expect(time).toHaveAttribute('aria-valuetext', 'Off');
  for (const label of [
    '1 year',
    ...[2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((year) => `${year} years`),
    'Final',
  ]) {
    await time.press('ArrowRight');
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(time).toHaveAttribute('aria-valuetext', 'Final');
  await time.press('Home');
  await toggle.click();
  await expect(measure).toHaveText('0.77×0.77 m');
  await berry.hover();
  await expect(measure).toHaveText('0.1 × 0.1 m · R 0.05 m');
  await apple.click();
  await expect(apple).toBeFocused();
  const clickedCanopy = await apple.screenshot({ animations: 'disabled' });
  await toggle.focus();
  expect(
    clickedCanopy.equals(await apple.screenshot({ animations: 'disabled' })),
    'Moving focus away should preserve the selected canopy appearance',
  ).toBe(true);
  await toggle.hover();
  await expect(measure).toHaveText('0.154 × 0.154 m · R 0.0769 m');
  await toggle.click();
  await time.press('ArrowRight');
  await expect(outline).toHaveAttribute('r', '36');
  await expect(strawberry).toHaveCount(0);
  await expect(measure).toHaveText('0.554 × 0.554 m · R 0.277 m');
  await expect(measure).toHaveAttribute('x', '40');
  await expect(measure).toHaveAttribute('y', '40');
  await time.hover();
  const track = await time.boundingBox();
  if (!track) throw new Error('Missing Future view slider');
  await time.click({ position: { x: track.width - 1, y: track.height / 2 } });
  await expect(strawberry).toHaveAttribute('r', '19.5');
  await expect(measure).toHaveText('6 × 6 m · R 3 m');
  await toggle.click();
  await expect(measure).toHaveAttribute('x', '40');
  await expect(measure).toHaveAttribute('y', '40');
  await berry.hover();
  await expect(measure).toHaveText('0.3 × 0.3 m · R 0.15 m');
  await map
    .locator('path.pointer-events-fill')
    .first()
    .click({ position: { x: 3, y: 3 } });
  await expect(measure).toHaveText('0.77×0.77 m');
  await toggle.click();
  await time.press('Home');
  for (let year = 1; year <= 5; year++) await time.press('ArrowRight');
  await expect(outline).toHaveAttribute('r', '140');
  await page.getByRole('button', { name: 'Place plants' }).click();
  await toggle.click();
  await expect(time).toHaveValue('5');
  await expect(outline).toHaveAttribute('cx', '50');
  await time.press('End');
  await time.press('ArrowLeft');
  await expect(outline).toHaveAttribute('r', '390');
  await expect(strawberry).toHaveCount(0);
  await page.getByRole('button', { name: /^Select .*Strawberry.*#1$/i }).click();
  await expect(page.getByText('Mature width appears in Final.')).toBeVisible();
  await page.getByRole('button', { name: /^Select .*Granny Smith.*#1$/ }).click();
  await time.press('End');
  await expect(outline).toHaveAttribute('r', '390');
  await expect(strawberry).toHaveAttribute('r', '19.5');
  await toggle.click();
  await page.getByRole('combobox', { name: 'Rootstock width' }).selectOption('1.5');
  await expect(outline).toHaveAttribute('r', '97.5');
  const width = page.getByRole('spinbutton', { name: 'Mature width (m)' });
  await width.fill('2.7');
  await map.getByRole('button', { name: /Select Strawberry.*on layout/ }).click();
  await expect(width).toHaveValue('');
  await expect(strawberry).toHaveAttribute('r', '19.5');
  await map.getByRole('button', { name: 'Select Granny Smith on layout' }).click();
  await expect(outline).toHaveAttribute('r', '175.5');
  await expect(measure).toHaveText('2.7 × 2.7 m · R 1.35 m');
  await expect(measure).toHaveAttribute('x', '40');
  await expect(measure).toHaveAttribute('y', '40');
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/gardens/') && r.request().method() === 'PUT' && r.ok(),
    ),
    page.getByRole('button', { name: 'Save', exact: true }).click(),
  ]);
  await page.reload();
  await page.setViewportSize({ width: 390, height: 844 });
  await toggle.click();
  await expect(time).toHaveValue('0');
  await expect(outline).toHaveCount(0);
  await time.press('End');
  await toggle.click();
  await expect(outline).toHaveAttribute('r', '175.5');
  await expect(outline).toBeInViewport({ ratio: 0.95 });
  await map.getByRole('button', { name: 'Select Granny Smith on layout' }).click();
  await expect(width).toHaveValue('2.7');
});

test('selects overlapping plants and distinguishes known and unknown mature sizes', async ({
  page,
}) => {
  await importLayoutGarden(page, [
    createLayoutPlant({ id: 'custom', speciesId: 'unknown', cultivarId: null }, 'Plant', {
      x: 50,
      y: 50,
      diameter: 10,
    }),
    createLayoutPlant(
      { id: 'hydrangea', speciesId: 'smooth_hydrangea', cultivarId: 'annabelle' },
      'Annabelle',
      { x: 26, y: 26, diameter: 48 },
    ),
  ]);
  const map = page.locator('svg[data-map-camera]');
  const measure = map.locator('[data-map-measure]');
  const settings = page.getByRole('button', { name: 'Map settings' });
  const slider = page.getByRole('slider', { name: 'Future view' });
  for (const path of ['/guilds/bed', '/guilds/bed/layout']) {
    await page.goto(path);
    const small = map.getByRole('button', { name: /^(Select )?Plant( on layout)?$/ });
    await small.click();
    await settings.hover();
    await expect(small).toHaveAttribute('aria-pressed', 'true');
    await expect(measure).toHaveText('0.0769 × 0.0769 m · R 0.0385 m');
    await settings.click();
    await slider.press('End');
    await expect(measure).toHaveText('Mature size unknown');
  }
  await settings.click();
  await map.getByRole('button', { name: 'Select Annabelle on layout' }).click();
  await expect(measure).toHaveText('2 × 2 m · R 1 m');
  await expect(
    page.getByRole('link', { name: 'Estimated maturity · 15 years' }),
  ).toBeVisible();
  await settings.click();
  await slider.press('Home');
  await slider.press('ArrowRight');
  await expect(measure).toHaveText('0.503 × 0.503 m · R 0.251 m');
});

test('moves a corner plant on mobile and explains its mature width', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 375, height: 667 });
  await importLayoutGarden(page, [createStrawberry({ x: 93, y: 93, diameter: 6 })]);
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const plant = map.getByRole('button', { name: /Select Strawberry/ });
  await plant.click();
  await page.getByRole('heading', { name: 'Plant layout' }).hover();
  await expect(map.locator('[data-map-measure]')).toBeInViewport({ ratio: 0.99 });
  const before = await plant.getAttribute('transform');
  await plant.dragTo(map);
  await expect(plant).toHaveAttribute('aria-pressed', 'true');
  await expect(plant).not.toHaveAttribute('transform', before!);

  await page.setViewportSize({ width: 390, height: 844 });
  const mapHeight = (await map.boundingBox())!.height;
  expect(mapHeight).toBeGreaterThan(150);
  const settings = page.getByRole('group', { name: 'Map settings' });
  const toggle = settings.getByRole('button', { name: 'Map settings' });
  const help = settings.getByRole('button', { name: 'How sizes are estimated' });
  const slider = settings.getByRole('slider', { name: 'Future view' });
  await toggle.press('Enter');
  await page.keyboard.press('Tab');
  await expect(help).toBeFocused();
  await page.keyboard.press('Delete');
  await expect(plant).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Tab');
  await expect(slider).toBeFocused();
  await slider.press('End');
  const projection = map.getByLabel('Estimated plant spreads').getByLabel(/^Strawberry/);
  await expect(projection).toBeVisible();
  const hint = settings.getByText(
    'These plants have no yearly estimate. Final shows their known mature widths.',
  );
  await expect(hint).toHaveCount(0);
  await help.click();
  await expect(hint).toBeInViewport();
  const position = (await slider.boundingBox())!;
  expect((await hint.boundingBox())!.y).toBeGreaterThanOrEqual(
    position.y + position.height,
  );
  await slider.press('Home');
  expect(await slider.boundingBox()).toEqual(position);
  expect((await map.boundingBox())!.height).toBe(mapHeight);
  await help.click();
  await expect(hint).toHaveCount(0);
  expect((await map.boundingBox())!.height).toBe(mapHeight);

  await page.setViewportSize({ width: 740, height: 360 });
  await slider.click();
  await expect(slider).not.toHaveValue('0');
  await help.click();
  await expect(hint).toBeInViewport();
  await slider.press('End');
  await toggle.click();
  await expect(projection).toBeInViewport({ ratio: 0.99 });
  await page.setViewportSize({ width: 667, height: 375 });
  await expect(projection).toBeInViewport({ ratio: 0.99 });
});

test('switches selection, cancels placement, and resizes immediately after Place', async ({
  page,
}) => {
  await importLayoutGarden(page, [createGrannySmiths(appleCanopy)]);
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const card = page.getByRole('region', { name: 'Guild details' });
  const firstPlace = card.getByRole('button', { name: /^Place .*#1 —/ });
  const secondPlace = card.getByRole('button', { name: /^Place .*#2 —/ });
  const firstSelect = card.getByRole('button', { name: /^Select .*#1$/ });
  const secondSelect = card.getByRole('button', { name: /^Select .*#2$/ });
  await expect(firstPlace).toHaveAccessibleName(/ — Placed$/);
  await expect(secondPlace).toHaveAccessibleName(/ — Not placed$/);
  await expect(firstPlace).toHaveAttribute('title', 'Placed');
  await expect(secondPlace).toHaveAttribute('title', 'Not placed');
  await expect(firstPlace.locator('svg')).toHaveClass(/text-sage-700/);
  await expect(secondPlace.locator('svg')).toHaveClass(/text-red-700/);
  await firstPlace.click();
  await expect(firstPlace).toHaveAccessibleName(/ — Editing placement$/);
  await expect(firstPlace).toHaveAttribute('title', 'Editing placement');
  await expect(firstPlace.locator('svg')).toHaveClass(/text-amber-700/);
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
  await importLayoutGarden(page, [createGrannySmiths(appleCanopy)]);
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
  await importLayoutGarden(page, [createGrannySmiths(appleCanopy)]);
  await page.goto('/guilds/bed');
  const map = page.locator('[data-main-svg]');
  const guildLabel = map.getByText('Orchard', { exact: true });
  await expect(guildLabel).toBeVisible();
  expect(
    await guildLabel.evaluate((label) =>
      [
        ...label.ownerSVGElement!.querySelectorAll('.canopy, path[fill-rule="evenodd"]'),
      ].every((graphic) =>
        Boolean(
          graphic.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING,
        ),
      ),
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Map settings', exact: true }).click();
  const labels = page.getByRole('group', { name: 'Labels', exact: true });
  await expect(labels.locator('label')).toHaveText([
    'Plants (max. zoom)',
    'Guilds',
    'Landmarks',
    'Paths',
  ]);
  const toggle = labels.getByRole('checkbox', { name: 'Plants (max. zoom)' });
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
  await page
    .getByRole('region', { name: 'Guild details' })
    .getByRole('button', { name: 'Remove from aerial map' })
    .click();
  await expect(map.locator('[data-plant-label]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(map.locator('[data-plant-label]')).toContainText('Granny Smith');
  await toggle.uncheck();
  await expect(map.locator('[data-plant-label]')).toHaveCount(0);
  await expect(map.getByText('Orchard', { exact: true })).toHaveCount(1);
});

test('legacy placeholders remain unplaced after import and reload', async ({ page }) => {
  await importLayoutGarden(page, [createGrannySmiths()], { legacy: true });
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  await expect(map).toBeVisible();
  await expect(map.locator('.canopy')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: /^Place .*#1 —/ })).toHaveAttribute(
    'title',
    'Not placed',
  );
  await expect(map.locator('.canopy')).toHaveCount(0);
});

test('moves a small selected canopy and resizes it without an initial size jump', async ({
  page,
}) => {
  await importLayoutGarden(page, [createGrannySmiths({ ...appleCanopy, diameter: 0.3 })]);
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
  const center = (transform: string) =>
    transform
      .match(/translate\(([^)]+)\)/)![1]!
      .split(' ')
      .map(Number);
  expect(center(resized!)).toEqual(
    center(before!).map((value) => expect.closeTo(value, 8)),
  );
});

test('previews plant graphics with the moving guild and restores them on cancellation', async ({
  page,
}) => {
  await importLayoutGarden(page, [createGrannySmiths(appleCanopy)]);
  await page.goto('/guilds/bed');
  const map = page.locator('[data-main-svg]');
  await page.getByRole('button', { name: 'Map settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Plants (max. zoom)' }).check();
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

test('toggles labels, reveals them across the canopy, and removes the exact individual', async ({
  page,
}) => {
  await importLayoutGarden(page, [createGrannySmiths(appleCanopy)]);
  await page.goto('/guilds/bed/layout');
  const map = page.getByLabel('Draw plant canopies');
  const label = map.locator('[data-plant-label]');
  const canopy = map.getByRole('button', { name: /Select .* on layout/ });
  await expect(label).toBeVisible();
  await page.getByRole('button', { name: 'Hide labels' }).click();
  await expect(label).toBeHidden();
  const ring = canopy.locator('.canopy-focus-ring');
  const box = await ring.boundingBox();
  if (!box) throw new Error('Missing canopy');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(label).toBeVisible();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2);
  await expect(label).toBeVisible();
  await page.getByRole('heading', { name: 'Plant layout' }).hover();
  await expect(label).toBeHidden();
  await map.focus();
  await page.keyboard.press('Tab');
  await expect(canopy).toBeFocused();
  await expect(ring).not.toHaveCSS('stroke', 'none');
  await expect(label).toBeVisible();
  await expect(canopy).toHaveAccessibleDescription(/0.154 × 0.154 m · R/);
  await page.getByRole('button', { name: 'Show labels' }).click();
  await expect(label).toBeVisible();
  await page.getByRole('button', { name: /^Select .*#1$/ }).click();
  await page.getByRole('button', { name: /^Remove .*#1 from bed$/ }).click();
  await expect(canopy).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Place .*#1 —/ })).toHaveAttribute(
    'title',
    'Not placed',
  );
  await expect(page.getByRole('button', { name: /^Place .*#/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(canopy).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Place .*#/ })).toHaveCount(2);
});

test('removes specific individuals from the aerial and unmapped guild editors', async ({
  page,
}) => {
  await importLayoutGarden(page, [createGrannySmiths(appleCanopy)]);
  for (const guildId of ['bed', 'unmapped']) {
    await page.goto('/guilds/bed');
    const card = page.getByRole('region', { name: 'Guild details' });
    const canopy = page.getByRole('button', { name: 'Granny Smith', exact: true });
    if (guildId === 'unmapped') {
      const unmap = card.getByRole('button', { name: 'Remove from aerial map' });
      await canopy.click();
      await unmap.click();
      await page.keyboard.press('Delete');
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect(canopy).toBeVisible();
      await unmap.click();
    } else {
      const prompts: string[] = [];
      page.on('dialog', async (dialog) => {
        prompts.push(dialog.message());
        await dialog.dismiss();
      });
      await canopy.click();
      await page.keyboard.down('Delete');
      await expect(canopy).toHaveCount(0);
      await page.keyboard.down('Delete');
      await page.keyboard.up('Delete');
      expect(prompts).toEqual([]);
      await page.keyboard.press('Delete');
      expect(prompts).toEqual([expect.stringContaining('Delete guild')]);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      await expect(canopy).toBeVisible();
    }
    const expand = card.getByRole('button', {
      name: /^(Expand|Collapse) .*Granny Smith/,
    });
    await expect(expand).toBeVisible();
    if ((await expand.getAttribute('aria-expanded')) === 'false') await expand.click();
    await card.getByRole('button', { name: /^Remove .*#1 from bed$/ }).click();
    await expect(card.getByRole('button', { name: /^Remove .* from bed$/ })).toHaveCount(
      1,
    );
    if (guildId === 'bed') {
      await card.getByRole('button', { name: 'Place plants' }).click();
      await expect(page.getByRole('button', { name: /^Place .*#1 —/ })).toHaveAttribute(
        'title',
        'Not placed',
      );
      await expect(page.getByLabel('Draw plant canopies').locator('.canopy')).toHaveCount(
        0,
      );
    }
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Remove .* from bed$/ })).toHaveCount(
      2,
    );
  }
});
