import { test, expect } from '@playwright/test';
import { createNewPlanThroughGate, openPlanSessionDrawer } from './helpers';

test.describe('guilds tab', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('lists guilds, opens detail panel, renames, and uses plan drawer', async ({
    page,
  }) => {
    await page.goto('/guilds');
    await createNewPlanThroughGate(page);

    await expect(page.getByRole('heading', { name: 'Guilds', level: 1 })).toBeVisible();
    await expect(page.getByText(/No guilds yet/)).toBeVisible();

    const guildList = page.getByRole('complementary', { name: 'Guild list' });
    const guildDetails = page.getByRole('region', { name: 'Guild details' });

    await page.getByRole('button', { name: 'Add guild' }).click();

    await expect(guildList.getByRole('article', { name: 'New guild' })).toBeVisible();
    await expect(guildDetails.getByRole('button', { name: 'Delete' })).toBeVisible();

    await guildDetails.locator('input').first().fill('Berry guild');
    await expect(guildList.getByRole('article', { name: 'Berry guild' })).toBeVisible();

    await page.getByRole('button', { name: 'Deselect guild, Guilds' }).click();
    await expect(guildDetails.getByRole('button', { name: 'Delete' })).toBeHidden();
    await expect(guildList.locator('.grid')).toBeVisible();

    await page.getByRole('button', { name: 'Add guild' }).click();
    await expect(guildList.getByRole('article', { name: 'New guild' })).toHaveCount(1);
    await expect(guildList.getByRole('article', { name: 'Berry guild' })).toBeVisible();

    await openPlanSessionDrawer(page);
    await expect(page.getByText('My garden', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Map scale')).toBeHidden();
  });
});
