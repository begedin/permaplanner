import * as gardensApi from './api/gardens';
import { usePermaplannerStore } from './usePermaplannerStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  waitFor,
} from '@testing-library/vue';
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

vi.mock('./api/gardens');

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

it('focuses and selects the current catalog value when editing an existing plant', async () => {
  useGardenStore().plants = [{ id: 'basil', speciesId: 'basil', cultivarId: 'genovese' }];
  const router = await createAuthedTestRouter('/plants');
  render(ThePlants, { global: { plugins: [router] } });

  await fireEvent.click(screen.getByRole('button', { name: 'Basil' }));

  const input = screen.getByRole('combobox', {
    name: 'Catalog species and cultivar',
  }) as HTMLInputElement;
  await waitFor(() => {
    expect(input).toHaveFocus();
    expect(input.value).toContain('Genovese');
    expect(input).toMatchObject({ selectionStart: 0, selectionEnd: input.value.length });
  });

  await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(useGardenStore().plants).toMatchObject([
    { id: 'basil', speciesId: 'basil', cultivarId: 'genovese' },
  ]);
});

it('explains why a placed plant cannot be deleted and keeps the plan savable', async () => {
  const router = await createAuthedTestRouter('/plants');
  const garden = useGardenStore();
  const plant = { id: 'basil', speciesId: 'basil', cultivarId: null };
  garden.plants = [plant];
  garden.guilds = [
    {
      id: 'bed',
      name: 'Bed',
      path: [],
      mulchLevel: 1,
      plants: [
        {
          id: 'instance',
          plantId: plant.id,
          nameOrCultivar: 'Basil',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
        },
      ],
    },
  ];
  const plan = usePermaplannerStore();
  plan.gardenId = 'garden';
  const session = useGardenSessionStore();
  session.markSaved();
  render(ThePlants, { global: { plugins: [router] } });
  const button = screen.getByRole('button', { name: 'Delete plant' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute(
    'title',
    'Remove this plant from its guilds before deleting it.',
  );
  await fireEvent.click(button);
  plan.backgroundOpacity = 0.7;
  vi.mocked(gardensApi.updateGarden).mockResolvedValue(1);
  vi.mocked(gardensApi.listGardens).mockResolvedValue([]);
  await session.save();
  expect(gardensApi.updateGarden).toHaveBeenCalledWith(
    'garden',
    expect.objectContaining({
      plants: [plant],
      guilds: [
        expect.objectContaining({
          plants: [expect.objectContaining({ plantId: plant.id })],
        }),
      ],
    }),
  );
  expect(session.status).toBe('saved');
});
