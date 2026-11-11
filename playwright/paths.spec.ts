import { setupAuthenticatedGarden, waitForMainApp } from './helpers';
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
    const bounds = await map.boundingBox();
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
      const y = bounds.y + 200;
      if (brush === 'Polygon (P)') {
        await page.mouse.click(x, y);
        await page.mouse.click(x + 80, y);
        await page.mouse.click(x + 80, y + 80);
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 80, y + 80, { steps: 10 });
        await page.mouse.up();
      }
      await page.keyboard.press('Enter');
      await expect(page.getByLabel(`${feature} name`, { exact: true })).toHaveValue(
        feature,
      );
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
    const beforeResize = await walkway.getAttribute('d');
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
    await expect(walkway).not.toHaveAttribute('d', beforeResize!);
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
  for (const button of [
    ...(await features.getByRole('button').all()),
    ...(await tools.getByRole('button').all()),
  ]) {
    await expect(button).toBeInViewport({ ratio: 1 });
    const box = await button.boundingBox();
    if (!box) throw new Error('Map control not visible');
    expect(box.x).toBeGreaterThanOrEqual(bounds.x);
    expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  }
  await features.getByRole('button', { name: 'Path', exact: true }).click();
  await tools.getByRole('button', { name: 'Select (V)' }).click();
  await expect(tools.getByRole('button', { name: 'Select (V)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await tools.getByRole('button', { name: 'Bounding box (R)' }).click();
  await page.mouse.move(bounds.x + 30, bounds.y + bounds.height - 100);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 100, bounds.y + bounds.height - 40, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.press('Enter');
  const editor = map.getByRole('group', { name: 'Path details' });
  await expect(editor).toBeVisible();
  const editorBounds = await editor.boundingBox();
  const toolsBounds = await tools.boundingBox();
  if (!editorBounds || !toolsBounds) throw new Error('Editor or tools not visible');
  expect(editorBounds.y).toBeGreaterThan(toolsBounds.y + toolsBounds.height);
  await tools.getByRole('button', { name: 'Select (V)' }).click();
  expect(errors).toEqual([]);
});
