import { within } from '@testing-library/dom';
import { cleanup, fireEvent } from '@testing-library/vue';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  type CatalogPlantPick,
} from './catalogPlantPick';
import GuildCard from './GuildCard.vue';
import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
import type { GardenThing, Guild } from './gardenTypes';
import { plantCatalog } from './plantCatalog';
import { createGuildTestRouter } from './testGuildRouter';
import { useGardenStore } from './useGardenStore';

const popoverShim = {
  showPopover: vi.fn(),
  hidePopover: vi.fn(),
};

const knownSpecies = () => plantCatalog.species.filter((s) => s.id !== 'unknown');

const comfreyPick = () =>
  catalogPickForSpeciesCultivar(buildCatalogPickGroups(knownSpecies()), 'comfrey', null)!;

const basilGenovesePick = () =>
  catalogPickForSpeciesCultivar(
    buildCatalogPickGroups(knownSpecies()),
    'basil',
    'genovese',
  )!;

const setEditorPick = async (
  wrapper: Awaited<ReturnType<typeof renderGuildCard>>,
  pick: CatalogPlantPick,
) => {
  const combobox = wrapper.findComponent(PlantCatalogCombobox);
  await combobox.setValue(pick);
  await nextTick();
};

const testGuild = {
  id: 'guild',
  name: 'Berry guild',
  mulchLevel: 1,
  path: [],
  plants: [],
} satisfies Guild;

beforeEach(() => {
  Object.assign(HTMLElement.prototype, popoverShim);
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  const store = useGardenStore();
  store.guilds = [{ ...testGuild, plants: [] }];
  store.plants = [];
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  popoverShim.showPopover.mockClear();
  popoverShim.hidePopover.mockClear();
  vi.restoreAllMocks();
  cleanup();
});

const renderGuildCard = async (
  props: { guildId: string; context: 'guilds' | 'aerialSidebar' } = {
    guildId: 'guild',
    context: 'guilds',
  },
) => {
  const router = createGuildTestRouter();
  await router.push(
    props.context === 'guilds' ? `/guilds/${props.guildId}` : `/aerial/${props.guildId}`,
  );
  await router.isReady();
  const wrapper = mount(GuildCard, {
    props,
    attachTo: document.body,
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
};

const card = (wrapper: Awaited<ReturnType<typeof renderGuildCard>>) =>
  within(wrapper.element as HTMLElement);

const baseThing = (
  overrides: Partial<GardenThing> & Pick<GardenThing, 'id' | 'plantId'>,
): GardenThing => ({
  height: 10,
  width: 10,
  x: 0,
  y: 0,
  nameOrCultivar: 'x',
  ...overrides,
});

it('updates guild name from the name input', async () => {
  const store = useGardenStore();
  store.guilds[0]!.name = 'Old';
  const wrapper = await renderGuildCard();
  fireEvent.update(card(wrapper).getByRole('textbox'), 'New');
  expect(store.guilds[0]).toMatchObject({ name: 'New' });
});

it('removes the last duplicate guild plant when remove-one is used', async () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  const first = baseThing({ id: 'thing-a', plantId: 'plant' });
  const second = baseThing({ id: 'thing-b', plantId: 'plant' });
  store.guilds = [
    {
      ...testGuild,
      name: 'Bed',
      plants: [first, second],
    },
  ];

  const wrapper = await renderGuildCard();
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Remove one plant from bed' }),
  );

  expect(store.guilds[0].plants).toEqual([first]);
});

it('deletes the guild when confirmed', async () => {
  const store = useGardenStore();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

  const wrapper = await renderGuildCard();
  card(wrapper).getByRole('button', { name: 'Delete' }).click();

  expect(confirm).toHaveBeenCalledWith(
    'Delete guild “Berry guild”? This cannot be undone.',
  );
  expect(store.guilds).toEqual([]);
  wrapper.unmount();
  await nextTick();
});

it('keeps the guild when deletion is cancelled', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const store = useGardenStore();

  const wrapper = await renderGuildCard();
  await fireEvent.click(card(wrapper).getByRole('button', { name: 'Delete' }));

  expect(store.guilds).toEqual([{ ...testGuild, plants: [] }]);
});

it('does not offer remove-one when there is only one instance', async () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      ...testGuild,
      name: 'Bed',
      plants: [baseThing({ id: 'only', plantId: 'plant' })],
    },
  ];

  const wrapper = await renderGuildCard();
  expect(
    card(wrapper).queryByRole('button', { name: 'Remove one plant from bed' }),
  ).toBeNull();
});

it('shows map size and an icon remove control when the guild is on the aerial map', async () => {
  const store = useGardenStore();
  store.guilds = [
    {
      ...testGuild,
      name: 'Bed',
      path: [
        { x: 0, y: 0 },
        { x: 130, y: 100 },
      ],
    },
  ];

  const wrapper = await renderGuildCard();

  expect(
    (wrapper.element as HTMLElement).querySelector(
      '[aria-label="Guild size on aerial map"]',
    )!.textContent,
  ).toBe('1.00×0.77');
  expect(
    card(wrapper)
      .getByRole('button', { name: 'Remove from aerial map' })
      .textContent?.trim(),
  ).toBe('⊖');

  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Remove from aerial map' }),
  );

  expect(store.guilds[0]).toMatchObject({ id: 'guild', path: [] });
});

it('remove-one only affects the subgroup row that has duplicates', async () => {
  const store = useGardenStore();
  store.plants = [
    { id: 'p-gen', speciesId: 'basil', cultivarId: 'genovese' },
    { id: 'p-def', speciesId: 'basil', cultivarId: null },
  ];
  const dupA = baseThing({ id: 't1', plantId: 'p-gen' });
  const dupB = baseThing({ id: 't2', plantId: 'p-gen' });
  const other = baseThing({ id: 't3', plantId: 'p-def' });
  store.guilds = [
    {
      ...testGuild,
      name: 'Bed',
      plants: [dupA, dupB, other],
    },
  ];

  const wrapper = await renderGuildCard();
  expect(
    card(wrapper).getAllByRole('button', { name: 'Remove one plant from bed' }),
  ).toHaveLength(1);

  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Remove one plant from bed' }),
  );

  expect(store.guilds[0].plants).toEqual([dupA, other]);
});

it('hides the add-plant editor until Add plant is clicked', async () => {
  const wrapper = await renderGuildCard();
  expect(card(wrapper).queryByRole('combobox')).toBeNull();
  expect(card(wrapper).queryByRole('button', { name: 'Add to guild' })).toBeNull();
});

it('adds the default catalog plant when Add to guild is clicked', async () => {
  const store = useGardenStore();
  const wrapper = await renderGuildCard();
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Add plant to guild' }),
  );
  await nextTick();
  await fireEvent.click(card(wrapper).getByRole('button', { name: 'Add to guild' }));

  expect(store.plants).toMatchObject([{ speciesId: 'apple', cultivarId: null }]);
  expect(store.guilds[0].plants).toHaveLength(1);
  expect(card(wrapper).queryByRole('combobox')).toBeNull();
});

it('adds the selected plant when Enter is pressed in the editor', async () => {
  const store = useGardenStore();
  const wrapper = await renderGuildCard();
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Add plant to guild' }),
  );
  await nextTick();

  await setEditorPick(wrapper, comfreyPick());
  await fireEvent.keyDown(card(wrapper).getByRole('combobox'), { key: 'Enter' });

  expect(store.guilds[0].plants).toHaveLength(1);
  expect(store.plants[0]).toMatchObject({ speciesId: 'comfrey', cultivarId: null });
});

it('opens the editor for an existing plant and updates it on confirm', async () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  const thing = baseThing({ id: 'thing-a', plantId: 'plant' });
  store.guilds = [{ ...testGuild, name: 'Bed', plants: [thing] }];

  const wrapper = await renderGuildCard();
  await fireEvent.click(card(wrapper).getByRole('button', { name: 'Edit plant in bed' }));
  await nextTick();

  expect(card(wrapper).getByRole('combobox')).toBeTruthy();
  expect(card(wrapper).queryByRole('button', { name: 'Add plant to guild' })).toBeNull();
  expect(card(wrapper).queryByLabelText('Comfrey')).toBeNull();

  await setEditorPick(wrapper, basilGenovesePick());
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Save plant in guild' }),
  );

  const basilPlant = store.plants.find(
    (p) => p.speciesId === 'basil' && p.cultivarId === 'genovese',
  );
  expect(store.guilds[0].plants).toEqual([
    {
      ...thing,
      plantId: basilPlant!.id,
      nameOrCultivar: 'Genovese',
    },
  ]);
  expect(store.plants).toMatchObject([
    { id: 'plant', speciesId: 'comfrey', cultivarId: null },
    { speciesId: 'basil', cultivarId: 'genovese' },
  ]);
});

it('cancels add plant without changing the guild', async () => {
  const store = useGardenStore();
  const wrapper = await renderGuildCard();
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Add plant to guild' }),
  );
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Cancel adding plant' }),
  );

  expect(store.guilds[0].plants).toEqual([]);
  expect(card(wrapper).queryByRole('combobox')).toBeNull();
  expect(
    card(wrapper).getByRole('button', { name: 'Add plant to guild' }),
  ).toBeTruthy();
});

it('cancels edit plant without changing the guild', async () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      ...testGuild,
      name: 'Bed',
      plants: [baseThing({ id: 'thing-a', plantId: 'plant' })],
    },
  ];

  const wrapper = await renderGuildCard();
  await fireEvent.click(card(wrapper).getByRole('button', { name: 'Edit plant in bed' }));
  await setEditorPick(wrapper, basilGenovesePick());
  await fireEvent.click(
    card(wrapper).getByRole('button', { name: 'Cancel editing plant' }),
  );

  expect(store.guilds[0].plants).toEqual([
    baseThing({ id: 'thing-a', plantId: 'plant' }),
  ]);
  expect(card(wrapper).getByLabelText('Comfrey')).toBeTruthy();
});
