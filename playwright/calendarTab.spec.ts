import { createGrannySmiths, importLayoutGarden } from './fixtures/guildLayout';
import {
  collectBrowserErrors,
  registerAndReachImport,
  addPlantToGuild,
  createNewPlanThroughGate,
  openNavTab,
} from './helpers';
import { expect, test } from './test';

test.describe('calendar tab', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('lists garden species, opens detail, searches, and shows guild counts', async ({
    page,
  }) => {
    await page.goto('/calendar');
    await createNewPlanThroughGate(page);
    await openNavTab(page, 'Calendar');

    await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Plant calendar' }).click();
    await expect(page.getByText(/No plants in your guilds yet/)).toBeVisible();

    await openNavTab(page, 'Guilds');
    await page.getByRole('button', { name: 'Add guild' }).click();

    const guildDetails = page.getByRole('region', { name: 'Guild details' });
    await addPlantToGuild(page, 'Malus domestica');
    await guildDetails.getByRole('button', { name: 'Add one plant to bed' }).click();
    await addPlantToGuild(page, 'Ocimum basilicum');

    await openNavTab(page, 'Calendar');

    await page.getByRole('link', { name: 'Plant calendar' }).click();
    const plantList = page.getByRole('complementary', { name: 'Garden plants' });
    const calendarDetails = page.getByRole('region', { name: 'Plant calendar details' });

    const appleListLabel = /Apple \(Malus domestica\), 1 cultivar · 2 plants/;
    const basilListLabel = /Basil \(Ocimum basilicum\), 1 cultivar · 1 plant/;

    await expect(plantList.getByRole('button', { name: appleListLabel })).toBeVisible();
    await expect(plantList.getByRole('button', { name: basilListLabel })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Search garden plants' }).fill('basil');
    await expect(plantList.getByRole('button', { name: /Basil \(/ })).toBeVisible();
    await expect(plantList.getByRole('button', { name: /Apple \(/ })).toBeHidden();

    await page.getByRole('searchbox', { name: 'Search garden plants' }).fill('');
    await plantList.getByRole('button', { name: appleListLabel }).click();

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
      calendarDetails.getByLabel('Aggregated harvest and bloom by month'),
    ).toBeVisible();
    await expect(
      calendarDetails.getByRole('heading', { name: 'Cultivars' }),
    ).toBeVisible();
    await expect(
      calendarDetails.getByRole('article', { name: 'Apple (Malus domestica)' }),
    ).toBeVisible();
    await expect(calendarDetails.getByText('2 plants in guilds')).toBeVisible();

    await page.getByRole('button', { name: 'Deselect plant, Calendar' }).click();
    await expect(
      calendarDetails.getByRole('heading', { name: 'Apple', level: 2 }),
    ).toBeHidden();
    await expect(plantList.getByRole('button', { name: /Apple \(/ })).toBeVisible();
  });
});

test('records, edits, and reloads observations across the garden', async ({ page }) => {
  await createNewPlanThroughGate(page);
  const errors = collectBrowserErrors(page);
  await openNavTab(page, 'Calendar');
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByLabel('Record for').locator('option:checked')).toHaveText(
    'Whole garden',
  );
  await dialog.getByLabel('Observation', { exact: true }).fill('First frost');
  await dialog.getByLabel('Date', { exact: true }).fill('2026-02-06');
  await dialog.getByRole('button', { name: 'Save observation' }).click();

  await openNavTab(page, 'Guilds');
  await page.getByRole('button', { name: 'Add guild' }).click();
  const details = page.getByRole('region', { name: 'Guild details' });
  await details.getByRole('button', { name: 'Record observation', exact: true }).click();
  await dialog.getByRole('radio', { name: 'Care' }).check();
  await dialog.getByLabel('Observation', { exact: true }).fill('Mulched bed');
  await dialog.getByLabel('Date', { exact: true }).fill('2026-02-05');
  await dialog.getByRole('button', { name: 'Save observation' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(details.getByText(/Care · Mulched bed/)).toBeVisible();
  await addPlantToGuild(page, 'Malus domestica');
  await details.getByRole('button', { name: /Record observation for Apple/ }).click();
  await dialog.getByRole('radio', { name: 'Flowering' }).check();
  await dialog.getByLabel('Observation', { exact: true }).fill('First flower');
  await dialog.getByLabel('Date', { exact: true }).fill('2026-02-06');
  await dialog.getByRole('button', { name: 'Save observation' }).click();
  await openNavTab(page, 'Calendar');
  const rows = page.getByLabel('Observation history').getByRole('listitem');
  await expect(rows).toHaveText([
    /Apple.*New guild.*Flowering.*First flower/s,
    /Whole garden.*Note.*First frost/s,
    /New guild.*Care.*Mulched bed/s,
  ]);
  await rows.first().getByRole('button').click();
  await dialog.getByLabel('Observation', { exact: true }).fill('First open blossom');
  await dialog.getByRole('button', { name: 'Save observation' }).click();
  await page.getByRole('button', { name: 'Record observation', exact: true }).click();
  await dialog.getByLabel('Record for').selectOption({ label: 'New guild' });
  await dialog.getByRole('radio', { name: 'Harvest' }).check();
  await dialog.getByLabel('Observation', { exact: true }).fill('Last apples');
  await dialog.getByLabel('Date', { exact: true }).fill('2026-09-20');
  await dialog.getByRole('button', { name: 'Save observation' }).click();
  const saved = page.waitForResponse(
    (r) => r.request().method() === 'PUT' && r.url().includes('/api/gardens/') && r.ok(),
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await saved;
  await page.reload();
  await expect(rows).toHaveText([
    /New guild.*Harvest.*Last apples/s,
    /Flowering.*First open blossom/s,
    /Note.*First frost/s,
    /Care.*Mulched bed/s,
  ]);
  await rows.last().getByRole('button').click();
  page.once('dialog', (prompt) => prompt.accept());
  await dialog.getByRole('button', { name: 'Delete observation' }).click();
  await expect(rows).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('imports legacy notes on mobile and loads older observations on scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registerAndReachImport(page);
  const errors = collectBrowserErrors(page);
  const apples = createGrannySmiths();
  apples.individuals = Array.from({ length: 67 }, (_, i) => ({
    ...apples.individuals[0]!,
    id: `tree-${i}`,
    observations: [
      { id: `old-${i}`, type: 'note', date: '2020-01-01', text: `Field record ${i}` },
    ],
  }));
  await importLayoutGarden(page, [apples], { legacy: true });
  await openNavTab(page, 'Calendar');
  const history = page.getByLabel('Observation history');
  const rows = history.getByRole('listitem');
  const today = await page.evaluate(() =>
    new Intl.DateTimeFormat('sv-SE').format(new Date()),
  );
  await expect(rows.first()).toContainText(today);
  await expect(rows.first()).toContainText(/Note.*Field record 66/s);
  await expect(rows).toHaveCount(30);
  await history.focus();
  await page.keyboard.press('End');
  await expect(rows).toHaveCount(60);
  await page.keyboard.press('End');
  await expect(rows).toHaveCount(67);
  await expect(rows.last()).toContainText('Field record 0');
  expect(errors).toEqual([]);
});
