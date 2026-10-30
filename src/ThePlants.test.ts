import { render, screen, fireEvent, cleanup, within } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createTestingPinia } from '@pinia/testing';

import { defaultCatalogPick } from './catalogPlantPick';
import { createAuthedTestRouter } from './testing/authedTestSession';
import ThePlants from './ThePlants.vue';
import { setActivePinia } from 'pinia';
import { useGardenStore } from './useGardenStore';
import { PLANT_ICON_IDS } from './plantIcons/iconIds';
import { plantCatalog } from './plantCatalog';
import { resolveUserPlant } from './resolvePlant';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  useGardenStore().plants = [];
});

afterEach(() => {
  cleanup();
});

it('creates a plant from catalog defaults', async () => {
  const router = await createAuthedTestRouter('/plants');
  render(ThePlants, { global: { plugins: [router] } });

  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(useGardenStore().plants).toHaveLength(1);
  const up = useGardenStore().plants[0];
  const expected = defaultCatalogPick(
    plantCatalog.species.filter((s) => s.id !== 'unknown'),
  );
  expect(up.speciesId).toBe(expected?.speciesId);
  expect(up.cultivarId).toBe(expected?.cultivarId ?? null);
  const r = resolveUserPlant(up, plantCatalog);
  expect(r.functions.length).toBeGreaterThan(0);
});

it('can override guild functions and save', async () => {
  const router = await createAuthedTestRouter('/plants');
  render(ThePlants, { global: { plugins: [router] } });

  await fireEvent.click(screen.getByRole('checkbox', { name: 'Wildfire Suppressor' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(useGardenStore().plants).toHaveLength(1);
  const r = resolveUserPlant(useGardenStore().plants[0], plantCatalog);
  expect(r.functions).toContain('wildfire_suppressor');
});

it('can set custom species name', async () => {
  const router = await createAuthedTestRouter('/plants');
  render(ThePlants, { global: { plugins: [router] } });

  await fireEvent.update(
    screen.getByPlaceholderText('Uses catalog name if empty'),
    'Herb patch',
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));

  expect(resolveUserPlant(useGardenStore().plants[0], plantCatalog).name).toBe(
    'Herb patch',
  );
});

it('offers every plant icon and saves a newly added icon choice', async () => {
  const router = await createAuthedTestRouter('/plants');
  render(ThePlants, { global: { plugins: [router] } });

  const picker = within(screen.getByRole('list', { name: 'Plant icons' }));
  expect(
    picker.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
  ).toEqual(PLANT_ICON_IDS);

  await fireEvent.click(picker.getByRole('button', { name: 'bouquet' }));
  expect(picker.getByRole('button', { name: 'bouquet' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(useGardenStore().plants).toMatchObject([
    { speciesOverride: { iconId: 'bouquet' } },
  ]);
});
