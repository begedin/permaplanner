import {
  registerAndReachImport,
  pasteAerialPhotoOntoMap,
  setupAuthenticatedGarden,
  waitForMainApp,
} from './helpers';
import { importLayoutGarden } from './fixtures/guildLayout';
import { rectangleShapePath } from '../src/mapShapeGeometry';
import { expect, test } from './test';

for (const feature of ['Path', 'Landmark']) {
  test(`draws ${feature.toLowerCase()}s with every brush, edits them, and restores saved shapes`, async ({
    page,
  }) => {
    await setupAuthenticatedGarden(page);
    const errors: string[] = [];
    page.on('console', (message) => {
      if (['error', 'warning'].includes(message.type())) errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/guilds');
    await waitForMainApp(page);
    const map = page.locator('[data-main-svg]');
    const bounds = await map.locator('[data-world-stage]').boundingBox();
    if (!bounds) throw new Error('Map not visible');

    for (const [index, brush] of [
      'Path brush (B)',
      'Polygon (P)',
      'Bounding box (R)',
    ].entries()) {
      await page
        .getByRole('button', {
          name: feature === 'Landmark' ? 'landmark' : feature,
          exact: true,
        })
        .click();
      await page.getByRole('button', { name: brush, exact: true }).click();
      const x = bounds.x + 70 + index * 150;
      const y = bounds.y + (brush === 'Bounding box (R)' ? 80 : 200);
      if (brush === 'Polygon (P)') {
        await page.mouse.click(x, y);
        await page.mouse.click(x + 80, y);
        await page.mouse.click(x + 80, y + 80);
        if (feature === 'Path') {
          const plan = page.getByRole('button', { name: /^Plan\b/ });
          await plan.press('Enter');
          await expect(page.getByRole('dialog', { name: 'Plan' })).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(plan).toBeFocused();
          await expect(page.getByLabel('Draw feature')).toBeVisible();
          await map.focus();
        }
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(
          x + 80,
          brush === 'Bounding box (R)' ? bounds.y - 2 : y + 80,
          { steps: 10 },
        );
        await page.mouse.up();
      }
      await page.keyboard.press('Enter');
      await expect(page.getByLabel(`${feature} name`, { exact: true })).toHaveValue(
        feature,
      );
      if (brush === 'Bounding box (R)') {
        const grip = page.getByLabel(`Rotate ${feature.toLowerCase()}`, { exact: true });
        await grip.hover();
        await page.mouse.down();
        const box = (await grip.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2 + 20);
        await page.mouse.up();
        await expect(page.getByLabel('Rotation (degrees)')).not.toHaveValue('0');
      }
      await page
        .getByLabel(`${feature} name`, { exact: true })
        .fill(`Walkway ${index + 1}`);
      await page.getByLabel(`${feature} name`, { exact: true }).press('Tab');
      await page.getByRole('button', { name: 'Done', exact: true }).click();
    }
    await expect(
      page.getByRole('button', { name: new RegExp(`^${feature}: Walkway`) }),
    ).toHaveCount(3);
    const walkway = page.getByRole('button', {
      name: `${feature}: Walkway 3`,
      exact: true,
    });
    const original = await walkway.locator('..').getAttribute('transform');
    const box = await walkway.boundingBox();
    if (!box) throw new Error('Path not visible');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 25, box.y + box.height / 2 + 20, {
      steps: 5,
    });
    await page.mouse.up();
    await expect(walkway.locator('..')).not.toHaveAttribute('transform', original!);
    const beforeResize = (await walkway.boundingBox())!;
    const handle = await page
      .getByLabel(`Resize ${feature.toLowerCase()} right edge`, { exact: true })
      .boundingBox();
    if (!handle) throw new Error('Resize handle not visible');
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      handle.x + handle.width / 2 + 20,
      handle.y + handle.height / 2,
      {
        steps: 5,
      },
    );
    await page.mouse.up();
    await expect
      .poll(async () => (await walkway.boundingBox())?.width)
      .toBeGreaterThan(beforeResize.width);
    await page.getByLabel('Rotation (degrees)').fill('30');
    await page.getByLabel('Rotation (degrees)').press('Tab');
    await page
      .getByRole('button', { name: `Delete ${feature.toLowerCase()}`, exact: true })
      .click();
    await expect(walkway).toHaveCount(0);
    await page.getByRole('button', { name: /Undo/ }).click();
    await expect(walkway).toHaveCount(1);
    const saved = await walkway.locator('..').getAttribute('transform');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await page.reload();
    await waitForMainApp(page);
    await expect(
      page.getByRole('button', { name: new RegExp(`^${feature}: Walkway`) }),
    ).toHaveCount(3);
    await expect(walkway.locator('..')).toHaveAttribute('transform', saved!);
    expect(errors).toEqual([]);
  });
}

test('keeps map controls reachable at 320px without overlapping the shape editor', async ({
  page,
}) => {
  await setupAuthenticatedGarden(page);
  const errors: string[] = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/guilds');
  await waitForMainApp(page);
  const map = page.getByRole('region', { name: 'Aerial map' });
  const tools = map.getByRole('toolbar', { name: 'Map tools' });
  const features = map.getByRole('group', { name: 'Feature' });
  const bounds = await map.boundingBox();
  if (!bounds) throw new Error('Map not visible');
  const selectBounds = (await tools
    .getByRole('button', { name: 'Select (V)' })
    .boundingBox())!;
  const settings = map.getByRole('button', { name: 'Map settings' });
  for (const button of [
    ...(await features.getByRole('button').all()),
    ...(await tools.getByRole('button').all()),
    map.getByRole('button', { name: 'Season', exact: true }),
    settings,
  ]) {
    await expect(button).toBeInViewport({ ratio: 1 });
    const box = await button.boundingBox();
    if (!box) throw new Error('Map control not visible');
    expect(box.y + box.height / 2).toBe(selectBounds.y + selectBounds.height / 2);
    expect(box.width).toBeCloseTo(selectBounds.width, 1);
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  }
  const leftEdge = (await features.boundingBox())!.x;
  const lastButton = (await settings.boundingBox())!;
  expect((leftEdge + lastButton.x + lastButton.width) / 2).toBeCloseTo(
    bounds.x + bounds.width / 2,
    1,
  );
  await features.getByRole('button', { name: 'Path', exact: true }).click();
  await tools.getByRole('button', { name: 'Select (V)' }).click();
  await expect(tools.getByRole('button', { name: 'Select (V)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await tools.getByRole('button', { name: 'Bounding box (R)' }).click();
  await page.mouse.move(bounds.x + 30, bounds.y + bounds.height - 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + bounds.height - 60, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('Enter');
  const editor = map.getByRole('group', { name: 'Path details' });
  await expect(editor).toHaveCount(0);
  const stage = (await map.locator('[data-world-stage]').boundingBox())!;
  await page.mouse.move(stage.x + 30, stage.y + stage.height - 30);
  await page.mouse.down();
  await page.mouse.move(stage.x + 100, stage.y + stage.height + 50, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('Enter');
  await expect(editor).toBeVisible();
  const bottom = await map
    .getByRole('button', { name: 'Path: Path', exact: true })
    .evaluate((element) => {
      const path = element as SVGGraphicsElement;
      const box = path.getBBox();
      return new DOMPoint(box.x, box.y + box.height).matrixTransform(path.getScreenCTM()!)
        .y;
    });
  expect(bottom).toBeCloseTo(stage.y + stage.height, 0);
  const editorBounds = await editor.boundingBox();
  const toolsBounds = await tools.boundingBox();
  if (!editorBounds || !toolsBounds) throw new Error('Editor or tools not visible');
  expect(editorBounds.y + editorBounds.height).toBeLessThan(toolsBounds.y);
  await tools.getByRole('button', { name: 'Select (V)' }).click();
  expect(errors).toEqual([]);
});

test('recovers landmarks only when the aerial map dimensions are known', async ({
  page,
}) => {
  await registerAndReachImport(page);
  await importLayoutGarden(page, [], {
    landmarks: [1500, 2500].map((x) => ({
      id: String(x),
      name: `Shed at ${x}`,
      x,
      y: 50,
      width: 60,
      height: 30,
      rotation: 0,
      path: rectangleShapePath(),
    })),
  });
  const settings = page.getByRole('button', { name: 'Map settings' });
  const recovery = page.getByRole('group', { name: 'Move onto map' });
  const shed = page.getByRole('button', { name: 'Landmark: Shed at 1500' }).locator('..');
  const position = await shed.getAttribute('transform');
  await settings.click();
  await expect(recovery.getByRole('button')).toHaveCount(2);

  await pasteAerialPhotoOntoMap(page, 'data:image/png;base64,YnJva2Vu');
  const unknownSize = page.getByText('Map editing needs the photo dimensions.', {
    exact: false,
  });
  await expect(unknownSize).toBeVisible();
  await expect(recovery).toHaveCount(0);
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await save.click();
  await expect(save).toBeDisabled();
  await page.reload();
  await expect(unknownSize).toBeVisible();
  await expect(shed).toHaveAttribute('transform', position!);
  await settings.click();
  await expect(recovery).toHaveCount(0);

  const photo = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 100;
    return canvas.toDataURL();
  });
  await pasteAerialPhotoOntoMap(page, photo);
  const outside = recovery.getByRole('button', { name: 'Landmark · Shed at 2500' });
  await expect(recovery.getByRole('button')).toHaveCount(1);
  await outside.click();
  await expect(recovery).toHaveCount(0);
  await expect(shed).toHaveAttribute('transform', position!);
});
