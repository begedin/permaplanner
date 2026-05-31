import { test, expect } from '@playwright/test';
import { addPlantToGuild, createNewPlanThroughGate, openNavTab } from './helpers';

test.describe('calendar tab', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('lists garden species, opens detail, searches, and shows guild counts', async ({
    page,
  }) => {
    await page.goto('/calendar');
    await createNewPlanThroughGate(page);

    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
    await expect(page.getByText(/No plants in your guilds yet/)).toBeVisible();

    await openNavTab(page, 'Guilds');
    await page.getByRole('button', { name: 'Add guild' }).click();

    const guildDetails = page.getByRole('region', { name: 'Guild details' });
    await addPlantToGuild(page, 'apple');
    await guildDetails.getByRole('button', { name: 'Add one plant to bed' }).click();
    await addPlantToGuild(page, 'basil');

    await openNavTab(page, 'Calendar');

    const plantList = page.getByRole('complementary', { name: 'Garden plants' });
    const calendarDetails = page.getByRole('region', { name: 'Plant calendar details' });

    await expect(
      plantList.getByRole('button', { name: /Apple, 1 cultivar · 2 plants/ }),
    ).toBeVisible();
    await expect(
      plantList.getByRole('button', { name: /Basil, 1 cultivar · 1 plant/ }),
    ).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search garden plants' }).fill('basil');
    await expect(plantList.getByRole('button', { name: /Basil,/ })).toBeVisible();
    await expect(plantList.getByRole('button', { name: /Apple,/ })).toBeHidden();

    await page.getByRole('searchbox', { name: 'Search garden plants' }).fill('');
    await plantList.getByRole('button', { name: /Apple, 1 cultivar · 2 plants/ }).click();

    await expect(
      page.getByRole('button', { name: 'Deselect plant, Calendar' }),
    ).toBeVisible();
    await expect(
      calendarDetails.getByRole('heading', { name: 'Apple', level: 2 }),
    ).toBeVisible();
    await expect(
      calendarDetails.getByText('1 cultivar · 2 plants in your garden'),
    ).toBeVisible();
    await expect(
      calendarDetails.getByLabel('Aggregated fruit and bloom by month'),
    ).toBeVisible();
    await expect(
      calendarDetails.getByRole('heading', { name: 'Cultivars' }),
    ).toBeVisible();
    await expect(calendarDetails.getByRole('article', { name: 'Apple' })).toBeVisible();
    await expect(calendarDetails.getByText('2 plants in guilds')).toBeVisible();

    await page.getByRole('button', { name: 'Deselect plant, Calendar' }).click();
    await expect(
      calendarDetails.getByRole('heading', { name: 'Apple', level: 2 }),
    ).toBeHidden();
    await expect(plantList.getByRole('button', { name: /Apple,/ })).toBeVisible();
  });
});
