import { createNewPlanThroughGate, openPlanSessionDrawer } from './helpers';
import { expect, test } from './test';

test.describe('guilds tab', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('lists guilds, opens detail panel, renames, and uses plan drawer', async ({
    page,
  }) => {
    await page.goto('/guilds');
    await createNewPlanThroughGate(page);

    await expect(page.getByRole('heading', { name: 'Guilds', level: 1 })).toBeVisible();
    await expect(page.getByText(/No guilds yet/)).toBeVisible();
    const season = page.getByRole('button', { name: 'Season', exact: true });
    const overview = page.locator('#garden-calendar footer');
    await expect(season).toHaveAttribute('aria-expanded', 'false');
    await expect(overview).toHaveCount(0);
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    for (const name of ['Guilds', 'Plants', 'Calendar']) {
      await expect(navigation.getByRole('link', { name, exact: true })).toBeVisible();
    }
    const toggleBounds = await page
      .getByRole('button', { name: 'Plan', exact: true })
      .boundingBox();
    const navigationBounds = await navigation.boundingBox();
    const headingBounds = await page
      .getByRole('heading', { name: 'Guilds', level: 1 })
      .boundingBox();
    expect(toggleBounds!.x + toggleBounds!.width).toBeLessThan(navigationBounds!.x);
    const headerBounds = await page.getByRole('banner').boundingBox();
    expect(navigationBounds!.x + navigationBounds!.width / 2).toBeCloseTo(
      headerBounds!.x + headerBounds!.width / 2,
      0,
    );
    expect(navigationBounds!.y + navigationBounds!.height / 2).toBeCloseTo(
      headingBounds!.y + headingBounds!.height / 2,
      0,
    );
    expect(toggleBounds!.y + toggleBounds!.height / 2).toBeCloseTo(
      headingBounds!.y + headingBounds!.height / 2,
      0,
    );

    const guildList = page.getByRole('complementary', { name: 'Guild list' });
    const listToggle = page.getByRole('button', { name: 'Guild list', exact: true });
    await expect(listToggle).toBeHidden();
    const guildDetails = page.getByRole('region', { name: 'Guild details' });

    await page.getByRole('button', { name: 'Add guild' }).click();

    await expect(guildList.getByRole('article', { name: 'New guild' })).toBeVisible();
    await expect(guildDetails.getByRole('button', { name: 'Delete' })).toBeVisible();
    const map = page.getByRole('region', { name: 'Aerial map' });
    await expect
      .poll(async () => {
        const detailsBounds = await guildDetails.boundingBox();
        const mapBounds = await map.boundingBox();
        return mapBounds!.width / detailsBounds!.width;
      })
      .toBeCloseTo(1.5, 1);
    await expect(page.getByRole('link', { name: 'Aerial', exact: true })).toHaveCount(0);

    await guildDetails.locator('input').first().fill('Berry guild');
    await guildDetails.locator('input').first().blur();
    await expect(guildList.getByRole('article', { name: 'Berry guild' })).toBeVisible();

    await page.getByRole('button', { name: 'Deselect guild, Guilds' }).click();
    await expect(guildDetails.getByRole('button', { name: 'Delete' })).toBeHidden();
    await expect(guildList.locator('.guild-list')).toBeVisible();
    await expect(guildDetails).toBeHidden();
    await expect
      .poll(async () => {
        const listBounds = await guildList.boundingBox();
        const mapBounds = await map.boundingBox();
        return mapBounds!.x - (listBounds!.x + listBounds!.width);
      })
      .toBeCloseTo(0, 1);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(guildList).toBeHidden();
    await expect(listToggle).toHaveAttribute('aria-expanded', 'false');
    await expect(map).toBeVisible();
    await page.getByRole('button', { name: 'Add guild' }).click();
    await expect(guildDetails.getByRole('article', { name: 'New guild' })).toBeVisible();
    await expect(map).toBeHidden();
    await listToggle.click();
    await expect(guildList.getByRole('article', { name: 'New guild' })).toHaveCount(1);
    await expect(guildList.getByRole('article', { name: 'Berry guild' })).toBeVisible();
    await expect.poll(async () => (await guildList.boundingBox())?.width).toBe(288);
    await page.setViewportSize({ width: 320, height: 844 });
    await expect.poll(async () => (await guildList.boundingBox())?.width).toBe(320);
    await page.keyboard.press('Escape');
    await expect(guildList).toBeHidden();
    await expect(listToggle).toBeFocused();
    await page.setViewportSize({ width: 390, height: 844 });
    await listToggle.click();
    await page
      .getByRole('button', { name: 'Close guild list' })
      .click({ position: { x: 380, y: 24 } });
    await expect(guildList).toBeHidden();
    const search = page.getByRole('searchbox', { name: 'Search guilds' });
    await search.fill('Berry');
    await expect(guildList.getByRole('article', { name: 'New guild' })).toBeHidden();
    await guildList.getByRole('article', { name: 'Berry guild' }).click();
    await expect(guildList).toBeHidden();
    const views = page.getByRole('navigation', { name: 'Guild views' });
    await expect(views.getByText('Berry guild', { exact: true })).toBeVisible();
    const detailsTab = views.getByRole('button', { name: 'Details' });
    const aerialTab = views.getByRole('button', { name: 'Aerial' });
    await expect(detailsTab).toHaveAttribute('aria-pressed', 'true');
    await page.setViewportSize({ width: 359, height: 844 });
    for (const name of ['Details', 'Aerial']) {
      expect((await views.getByText(name, { exact: true }).boundingBox())!.width).toBe(1);
    }
    await page.setViewportSize({ width: 360, height: 844 });
    for (const name of ['Details', 'Aerial']) {
      expect(
        (await views.getByText(name, { exact: true }).boundingBox())!.width,
      ).toBeGreaterThan(1);
    }
    const confirmations: string[] = [];
    page.on('dialog', async (dialog) => {
      confirmations.push(dialog.message());
      await dialog.dismiss();
    });
    await detailsTab.press('Delete');
    expect(confirmations).toEqual([]);
    await aerialTab.click();
    await expect(map).toBeVisible();
    await expect(guildDetails).toBeHidden();
    await detailsTab.click();
    await expect(
      guildDetails.getByRole('article', { name: 'Berry guild' }),
    ).toBeVisible();
    await aerialTab.click();

    const settingsButton = map.getByRole('button', { name: 'Map settings' });
    const seasonBox = (await season.boundingBox())!;
    const settingsBox = (await settingsButton.boundingBox())!;
    expect(settingsBox.y).toBe(seasonBox.y);
    expect(settingsBox.height).toBe(seasonBox.height);

    await openPlanSessionDrawer(page);
    await expect(
      page
        .getByRole('dialog', { name: 'Plan' })
        .locator('strong', { hasText: 'My garden' }),
    ).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: 'Plan' }).getByLabel('Reference line length'),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await settingsButton.click();
    await expect(map.getByLabel('Reference line length')).toBeVisible();
    await expect(map.getByLabel('BG opacity')).toBeVisible();
    await season.click();
    await expect(
      overview.getByRole('group', { name: 'Harvest by month' }),
    ).toBeInViewport();

    await navigation.getByRole('link', { name: 'Calendar' }).click();
    await expect(page).toHaveURL(/\/calendar$/);
    await expect(season).toHaveAttribute('aria-expanded', 'true');
    await season.click();
    await expect(overview).toHaveCount(0);
  });
});

test.describe('narrow mobile viewport', () => {
  test.use({ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } });

  test('scrolls the 320 px garden after resizing to 214 px', async ({ page }) => {
    await createNewPlanThroughGate(page);
    const list = page.locator('#guild-list');
    await expect(list.getByText(/No guilds yet/)).toHaveCount(0);
    const toggle = page.getByRole('button', { name: 'Guild list', exact: true });
    await toggle.tap();
    await expect(list.getByText(/No guilds yet/)).toBeVisible();
    await toggle.tap();
    await expect(list).toBeHidden();
    await page.setViewportSize({ width: 214, height: 844 });

    await expect.poll(() => page.evaluate(() => window.visualViewport?.scale)).toBe(1);
    await expect
      .poll(() => page.getByRole('banner').evaluate((header) => header.clientWidth))
      .toBe(320);

    const calendar = page.getByRole('link', { name: 'Calendar', exact: true });
    await expect(calendar).not.toBeInViewport();
    await calendar.scrollIntoViewIfNeeded();
    await expect(calendar).toBeInViewport({ ratio: 1 });
    await calendar.tap();
    await expect(page).toHaveURL(/\/calendar$/);
  });
});
