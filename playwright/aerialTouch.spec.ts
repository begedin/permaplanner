import type { Locator, Page } from '@playwright/test';
import {
  createGrannySmiths,
  createStrawberry,
  importLayoutGarden,
  layoutTest as test,
  mapShape,
  pointOnShape,
} from './fixtures/guildLayout';
import { expect } from './test';

test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
type Point = { x: number; y: number };
const nearPoint = ({ x, y }: Point) => ({
  x: expect.closeTo(x, 1),
  y: expect.closeTo(y, 1),
});
const movedBox = (
  box: Point & { width: number; height: number },
  dx: number,
  dy: number,
) => ({
  ...nearPoint({ x: box.x + dx, y: box.y + dy }),
  width: expect.closeTo(box.width, 2),
  height: expect.closeTo(box.height, 2),
});

const zoomBy = (map: Locator, factor: number, at: Point) =>
  map.dispatchEvent('wheel', {
    ctrlKey: true,
    deltaY: -100 * Math.log(factor),
    clientX: at.x,
    clientY: at.y,
  });

const touchscreen = async (page: Page) => {
  const touch = await page.context().newCDPSession(page);
  type TouchPoint = Point & { id?: number };
  const sendTouch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    touchPoints: TouchPoint[] = [],
    timestamp?: number,
  ) => touch.send('Input.dispatchTouchEvent', { type, touchPoints, timestamp });
  const swipe = async (from: Point, dx: number, dy: number) => {
    const to = { x: from.x + dx, y: from.y + dy };
    // CDP uses seconds. A finger pauses at the end of a drag before it lifts.
    const end = Date.now() / 1000;
    await sendTouch('touchStart', [from], end - 0.16);
    await sendTouch('touchMove', [to], end - 0.08);
    await sendTouch('touchEnd', [], end);
    return to;
  };
  return { sendTouch, swipe };
};

// These gestures need native pointer capture and SVG hit testing in a browser.
test('pans over a landmark, moves it after a tap, and cancels an edit on pinch', async ({
  page,
}) => {
  await importLayoutGarden(page, [], { landmarks: [mapShape('Shed', 38, 59, 28, 6)] });
  const map = page.getByLabel('Aerial map canvas');
  const bed = map.locator('path.pointer-events-fill').first();
  const corner = (await bed.boundingBox())!;
  const { sendTouch, swipe } = await touchscreen(page);
  const fingers = (gap: number) =>
    [-1, 1].map((sign, id) => ({
      x: corner.x + 15,
      y: corner.y + 35 + sign * gap,
      id: id + 1,
    }));
  const landmark = map.getByRole('button', { name: 'Landmark: Shed' });
  const shed = landmark.locator('..');
  const original = await shed.getAttribute('transform');
  await sendTouch('touchStart', fingers(12).slice(0, 1));
  await sendTouch('touchStart', fingers(12));
  await sendTouch('touchMove', fingers(42));
  await sendTouch('touchEnd');
  const before = (await bed.boundingBox())!;
  expect(before.width / corner.width).toBeCloseTo(3.5, 1);
  const done = page.getByRole('button', { name: 'Done', exact: true });
  await expect(done).toBeHidden();

  const shapeBox = (await landmark.boundingBox())!;
  const center = await pointOnShape(landmark);
  const end = await swipe(center, 7, -2);
  const after = (await bed.boundingBox())!;
  expect(after.x - before.x).toBeCloseTo(7, 0);
  expect(after.y - before.y).toBeCloseTo(-2, 0);
  await expect(shed).toHaveAttribute('transform', original!);
  await expect(done).toBeHidden();

  await sendTouch('touchStart', [end]);
  await page.keyboard.press('Escape');
  await sendTouch('touchEnd');
  await expect(done).toBeHidden();

  const edge = await pointOnShape(landmark, 0.49, 0);
  await swipe(edge, 4, 0);
  await expect(page.getByLabel('Landmark name')).toHaveValue('Shed');
  const selectedBox = await landmark.boundingBox();
  await swipe(end, 1, 0);
  expect(await landmark.boundingBox()).toEqual(selectedBox);
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  await expect(undo).toBeDisabled();
  await swipe(end, -7, 2);
  expect(await landmark.boundingBox()).toEqual({
    x: expect.closeTo(shapeBox.x, 0),
    y: expect.closeTo(shapeBox.y, 0),
    width: expect.closeTo(shapeBox.width, 2),
    height: expect.closeTo(shapeBox.height, 2),
  });
  await undo.tap();
  await expect(shed).toHaveAttribute('transform', original!);

  // Adding a second finger during an edit discards its preview.
  await sendTouch('touchStart', [{ ...end, id: 1 }]);
  await sendTouch('touchMove', [{ ...center, id: 1 }]);
  await expect(shed).not.toHaveAttribute('transform', original!);
  await sendTouch('touchStart', [
    { ...center, id: 1 },
    { x: center.x + 30, y: center.y, id: 2 },
  ]);
  await sendTouch('touchEnd');
  await expect(shed).toHaveAttribute('transform', original!);
  await expect(undo).toBeDisabled();
  await done.tap();
  await expect(done).toBeHidden();
});

test('taps plants without moving the map and opens the tapped guild', async ({
  page,
}) => {
  await importLayoutGarden(page, [
    createGrannySmiths({ x: 72, y: 64, diameter: 20 }),
    createStrawberry({ x: 88, y: 85, diameter: 12 }),
  ]);
  const map = page.getByLabel('Aerial map canvas');
  const bed = map.locator('path.pointer-events-fill').first();
  const center = await pointOnShape(bed, 50, 50);
  await zoomBy(map, 3.5, center);
  const plant = map.getByRole('button', { name: 'Granny Smith', exact: true });
  await plant.locator('.canopy-focus-ring').tap();
  await expect(plant).toHaveAttribute('aria-pressed', 'true');
  await expect(map.locator('[data-map-measure]')).toContainText('0.154 × 0.154 m');
  await expect(map.locator('[data-map-measure]')).toBeInViewport();
  const beforeSwitch = await bed.boundingBox();
  const berry = map.getByRole('button', { name: /^Strawberry/ });
  await berry.locator('.canopy-focus-ring').tap();
  await expect(berry).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => bed.boundingBox()).toEqual(beforeSwitch);
  await page.getByRole('button', { name: 'Guild list', exact: true }).tap();
  await page.getByRole('button', { name: 'Aerial', exact: true }).tap();
  await expect
    .poll(async () => (await bed.boundingBox())!.width)
    .toBeGreaterThan(beforeSwitch!.width);
  const views = page.getByRole('navigation', { name: 'Guild views' });
  const clear = views.getByRole('button', { name: 'Clear guild selection' });
  const button = (await clear.boundingBox())!;
  const name = (await views.getByText('Orchard', { exact: true }).boundingBox())!;
  expect(button.x + button.width).toBeLessThanOrEqual(name.x);
  await clear.tap();
  await expect(page).toHaveURL(/\/guilds$/);
  await expect(views).toBeHidden();
  await zoomBy(map, 0.01, center);
  await map.locator('path.pointer-events-fill').nth(1).tap();
  await expect(page).toHaveURL(/\/guilds\/other$/);
  await expect(page.getByRole('region', { name: 'Guild details' })).toBeVisible();
  await clear.press('Enter');
  await expect(map).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Guild list', exact: true }),
  ).toBeFocused();
});

test('moves a landmark after collapsing its details on a short phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await importLayoutGarden(page, [], {
    landmarks: [mapShape('Bench', 330, 918, 32, 24)],
  });
  const bench = page.getByRole('button', { name: 'Landmark: Bench' });
  await bench.tap();
  const heading = page
    .getByRole('group', { name: 'Landmark details' })
    .locator('summary');
  const start = await pointOnShape(bench);
  await heading.tap();
  const { swipe } = await touchscreen(page);
  const end = await swipe(start, 18, -9);
  expect(await pointOnShape(bench)).toEqual(nearPoint(end));
  await expect(heading).toBeInViewport({ ratio: 1 });
  await heading.tap();
  await expect(page.getByRole('textbox', { name: 'Landmark name' })).toHaveValue('Bench');
});

test('swipes across a neighboring path and moves it by its painted arm', async ({
  page,
}) => {
  const strip = mapShape('Strip', 158, 380, 200, 6);
  const elbow = mapShape('Elbow', 205, 471, 140, 120, [
    [
      [
        { x: -0.5, y: -0.5 },
        { x: 0.5, y: -0.5 },
        { x: 0.5, y: -0.43 },
        { x: -0.43, y: -0.43 },
        { x: -0.43, y: 0.5 },
        { x: -0.5, y: 0.5 },
        { x: -0.5, y: -0.5 },
      ],
    ],
  ]);
  await importLayoutGarden(page, [], { landmarks: [strip], paths: [elbow] });
  await page.getByRole('button', { name: 'Landmark: Strip' }).tap();
  const path = page.getByRole('button', { name: 'Path: Elbow' });
  const arm = await pointOnShape(path, 0.19, -0.465);
  const { swipe } = await touchscreen(page);
  await swipe(arm, 12, -18);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await expect(page.getByLabel('Landmark name')).toHaveValue('Strip');
  await page.touchscreen.tap(arm.x, arm.y);
  await expect(page.getByLabel('Path name')).toHaveValue('Elbow');
  const before = (await path.boundingBox())!;
  await swipe(arm, 12, -18);
  expect(await path.boundingBox()).toEqual(movedBox(before, 12, -18));
});

test('collapses details to move and resize a landmark at the map boundary', async ({
  page,
}) => {
  await importLayoutGarden(page, [], {
    landmarks: [mapShape('Border post', 975, 110, 50, 110)],
  });
  const shape = page.getByRole('button', { name: 'Landmark: Border post' });
  await shape.tap();
  const details = page.getByRole('group', { name: 'Landmark details' });
  const toggle = details.locator('summary');
  const before = (await shape.boundingBox())!;
  const contact = await pointOnShape(shape, 0, -0.25);
  expect(
    await details.evaluate(
      (panel, point) => panel.contains(document.elementFromPoint(point.x, point.y)),
      contact,
    ),
  ).toBe(true);
  await toggle.tap();
  await expect(page.getByLabel('Landmark name')).toBeHidden();
  const { swipe } = await touchscreen(page);
  await swipe(contact, -18, 12);
  expect(await shape.boundingBox()).toEqual(movedBox(before, -18, 12));
  await page.getByRole('button', { name: 'Undo', exact: true }).tap();
  const grip = page.getByLabel('Resize landmark right handle', { exact: true });
  await expect(grip).toBeInViewport({ ratio: 1 });
  await swipe(await pointOnShape(grip), -12, 0);
  const resized = (await shape.boundingBox())!;
  expect(resized.width).toBeLessThan(before.width);
  expect(resized.x).toBeCloseTo(before.x, 1);
  await toggle.press('Enter');
  await expect(page.getByLabel('Landmark name')).toHaveValue('Border post');
  await expect(toggle).toBeFocused();
  const angle = page.getByLabel('Rotation (degrees)');
  await angle.fill('30');
  await angle.press('Tab');
  await toggle.tap();
  const corner = page.getByLabel('Resize landmark top-right handle', { exact: true });
  await expect(corner).toBeInViewport({ ratio: 1 });
  const opposite = await pointOnShape(shape, -0.5, 0.5);
  const from = await pointOnShape(shape, 0.5, -0.5);
  await swipe(await pointOnShape(corner), -9, 12);
  const to = await pointOnShape(shape, 0.5, -0.5);
  expect(Math.hypot(to.x - opposite.x, to.y - opposite.y)).toBeLessThan(
    Math.hypot(from.x - opposite.x, from.y - opposite.y),
  );
  expect(await pointOnShape(shape, -0.5, 0.5)).toEqual(nearPoint(opposite));
});

test('keeps small landmarks reachable under padded handles', async ({ page }) => {
  await importLayoutGarden(page, [], {
    landmarks: [
      mapShape('Rail', 200, 455, 180, 6),
      mapShape('Dot', 200, 491, 7, 7),
      mapShape('Pin', 5, 465, 10, 10),
      mapShape('Valve', 35, 55, 10, 10),
    ],
  });
  const rail = page.getByRole('button', { name: 'Landmark: Rail' });
  await rail.tap();
  const { swipe } = await touchscreen(page);
  const dotShape = page.getByRole('button', { name: 'Landmark: Dot' });
  const dot = await pointOnShape(dotShape);
  await swipe(dot, 0, 14);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.touchscreen.tap(dot.x, dot.y);
  await expect(page.getByLabel('Landmark name')).toHaveValue('Dot');
  await rail.click();
  await expect(page.getByLabel('Landmark name')).toHaveValue('Rail');
  await page.mouse.move(dot.x, dot.y);
  await page.mouse.down();
  await page.mouse.move(dot.x + 12, dot.y + 14);
  await page.mouse.up();
  await expect(page.getByLabel('Landmark name')).toHaveValue('Dot');
  expect(await pointOnShape(dotShape)).toEqual({
    x: expect.closeTo(dot.x + 12, 1),
    y: expect.closeTo(dot.y + 14, 1),
  });
  const pin = page.getByRole('button', { name: 'Landmark: Pin' });
  await pin.tap();
  const start = await pointOnShape(pin);
  const end = await swipe(start, 20, 0);
  expect(await pointOnShape(pin)).toEqual(nearPoint(end));

  const valve = page.getByRole('button', { name: 'Landmark: Valve' });
  await valve.tap();
  const width = (await valve.boundingBox())!.width;
  const handle = page.getByLabel('Resize landmark right handle', { exact: true });
  await swipe(await pointOnShape(handle), 8, 0);
  expect((await valve.boundingBox())!.width).toBeGreaterThan(width);
});

test('hides resize handles when their edge leaves the viewport', async ({ page }) => {
  await importLayoutGarden(page, [], {
    landmarks: [mapShape('Post', 500, 650, 4, 40), mapShape('Marker', 509, 650, 6, 30)],
  });
  const map = page.getByLabel('Aerial map canvas');
  const post = page.getByRole('button', { name: 'Landmark: Post' });
  await zoomBy(map, 4, await pointOnShape(post));
  await post.tap();
  await page.getByRole('group', { name: 'Landmark details' }).locator('summary').tap();
  const point = await pointOnShape(post);
  const box = (await map.boundingBox())!;
  await map.dispatchEvent('wheel', {
    deltaX: point.x - box.x + 9,
    clientX: point.x,
    clientY: point.y,
  });
  await expect(
    page.getByLabel('Resize landmark right handle', { exact: true }),
  ).toBeHidden();
  const marker = page.getByRole('button', { name: 'Landmark: Marker' });
  const start = await pointOnShape(marker);
  const { swipe } = await touchscreen(page);
  await swipe(start, 17, 0);
  expect((await pointOnShape(marker)).x).toBeCloseTo(start.x + 17, 1);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
});

test('swipes over a landmark beneath a handle at the edge of the map', async ({
  page,
}) => {
  await importLayoutGarden(page, [], {
    landmarks: [mapShape('Patio', 150, 455, 300, 160), mapShape('Badge', 7, 455, 4, 6)],
  });
  const patio = page.getByRole('button', { name: 'Landmark: Patio' });
  const left = await pointOnShape(patio, -0.5, 0);
  await zoomBy(page.getByLabel('Aerial map canvas'), 2, left);
  await patio.tap();
  const badge = page.getByRole('button', { name: 'Landmark: Badge' });
  const start = await pointOnShape(badge);
  const { swipe } = await touchscreen(page);
  await swipe(start, 12, -10);
  const after = await pointOnShape(badge);
  expect(after.y).toBeCloseTo(start.y - 10, 0);
  await expect(page.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await page.touchscreen.tap(after.x, after.y);
  await expect(page.getByLabel('Landmark name')).toHaveValue('Badge');
});
