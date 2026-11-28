import { usePlanStateStore } from './usePlanStateStore';
import * as gardensApi from './api/gardens';
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

import { createAuthedTestRouter } from './testing/authedTestSession';
import ThePlants from './ThePlants.vue';
import { setActivePinia } from 'pinia';
import { PLANT_ICON_IDS } from './plantIcons/iconIds';

vi.mock('./api/gardens');
vi.mock(import('./data/plantCatalog.json'), async (importOriginal) => {
  const catalog = await importOriginal();
  const species = catalog.default.species.filter(({ id }) =>
    ['unknown', 'basil', 'hibiscus'].includes(id),
  );
  return { ...catalog, species, default: { species } };
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(cleanup);

const renderPlants = async () => {
  const router = await createAuthedTestRouter('/plants');
  render(ThePlants, { global: { plugins: [router] } });
};

it('creates a plant from catalog defaults', async () => {
  await renderPlants();

  expect(screen.getByRole('checkbox', { name: 'Edible' })).toBeChecked();
  await fireEvent.click(screen.getByRole('button', { name: 'Create' }));
  expect(usePlanStateStore().state.plants).toEqual([
    { id: expect.any(String), speciesId: 'basil', cultivarId: null },
  ]);
});

it('keeps function, layer, name, and icon edits through save and reopen', async () => {
  usePlanStateStore().state.plants = [
    { id: 'hibiscus', speciesId: 'hibiscus', cultivarId: 'lord_baltimore' },
  ];
  await renderPlants();
  await fireEvent.click(screen.getByRole('button', { name: 'Hibiscus' }));

  const wildfire = screen.getByRole('checkbox', { name: 'Wildfire Suppressor' });
  const root = screen.getByRole('checkbox', { name: 'Root' });
  await fireEvent.click(wildfire);
  await fireEvent.update(
    screen.getByPlaceholderText('Uses catalog name if empty'),
    'Herb patch',
  );
  expect(wildfire).toBeChecked();
  await fireEvent.click(root);
  const picker = within(screen.getByRole('list', { name: 'Plant icons' }));
  expect(
    picker.getAllByRole('button').map((button) => button.getAttribute('aria-label')),
  ).toEqual(PLANT_ICON_IDS);

  await fireEvent.click(picker.getByRole('button', { name: 'bouquet' }));
  expect(picker.getByRole('button', { name: 'bouquet' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  expect(usePlanStateStore().state.plants).toMatchObject([
    {
      speciesOverride: { iconId: 'bouquet' },
      cultivarOverride: { layers: ['herb', 'root'] },
    },
  ]);
  await fireEvent.click(screen.getByRole('button', { name: 'New' }));
  await fireEvent.click(screen.getByRole('button', { name: 'Herb patch' }));
  expect(wildfire).toBeChecked();
  expect(root).toBeChecked();
  expect(screen.getByRole('button', { name: 'bouquet', pressed: true })).toBeVisible();
});

it('focuses and selects the current catalog value when editing an existing plant', async () => {
  usePlanStateStore().state.plants = [
    { id: 'basil', speciesId: 'basil', cultivarId: 'genovese' },
  ];
  await renderPlants();

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
  expect(usePlanStateStore().state.plants).toMatchObject([
    { id: 'basil', speciesId: 'basil', cultivarId: 'genovese' },
  ]);
});

it('explains why a placed plant cannot be deleted and keeps the plan savable', async () => {
  const plant = { id: 'basil', speciesId: 'basil', cultivarId: null };
  usePlanStateStore().state.plants = [plant];
  usePlanStateStore().state.guilds = [
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
  useGardenSessionStore().gardenId = 'garden';
  const session = useGardenSessionStore();
  session.markSaved();
  await renderPlants();
  const button = screen.getByRole('button', { name: 'Delete plant' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute(
    'title',
    'Remove this plant from its guilds before deleting it.',
  );
  await fireEvent.click(button);
  usePlanStateStore().state.backgroundOpacity = 0.7;
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
