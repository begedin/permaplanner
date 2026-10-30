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
      .toBeCloseTo(2, 1);
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

    await page.getByRole('button', { name: 'Add guild' }).click();
    await expect(guildList.getByRole('article', { name: 'New guild' })).toHaveCount(1);
    await expect(guildList.getByRole('article', { name: 'Berry guild' })).toBeVisible();

    await openPlanSessionDrawer(page);
    await expect(
      page
        .getByRole('dialog', { name: 'Plan' })
        .locator('strong', { hasText: 'My garden' }),
    ).toBeVisible();
    await expect(
      page.getByRole('dialog', { name: 'Plan' }).getByLabel('Map scale'),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await map.getByRole('button', { name: 'Map settings' }).click();
    await expect(map.getByLabel('Map scale')).toBeVisible();
    await expect(map.getByLabel('BG opacity')).toBeVisible();
  });
});
