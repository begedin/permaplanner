import { cleanup, fireEvent, render } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import GuildCard from './GuildCard.vue';
import type { GardenThing } from './gardenTypes';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const baseThing = (overrides: Partial<GardenThing> & Pick<GardenThing, 'id' | 'plantId'>): GardenThing => ({
  height: 10,
  width: 10,
  x: 0,
  y: 0,
  nameOrCultivar: 'x',
  ...overrides,
});

it('renders nothing when the guild id is not in the store', () => {
  useGardenStore().guilds = [];
  const { container } = render(GuildCard, { props: { guildId: 'missing' } });
  expect(container.textContent).toEqual('');
});

it('updates guild name from the name input', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'g', name: 'Old', plants: [], path: [], mulchLevel: 1 }];
  const wrapper = render(GuildCard, { props: { guildId: 'g' } });
  fireEvent.update(wrapper.getByRole('textbox'), 'New');
  expect(store.guilds[0]).toMatchObject({ name: 'New' });
});

it('removes the last duplicate guild plant when remove-one is used', async () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  const first = baseThing({ id: 'thing-a', plantId: 'plant' });
  const second = baseThing({ id: 'thing-b', plantId: 'plant' });
  store.guilds = [
    {
      id: 'guild',
      name: 'Bed',
      mulchLevel: 1,
      path: [],
      plants: [first, second],
    },
  ];

  const wrapper = render(GuildCard, { props: { guildId: 'guild' } });
  await fireEvent.click(wrapper.getByRole('button', { name: 'Remove one plant from bed' }));

  expect(store.guilds[0].plants).toEqual([first]);
});

it('deletes the guild when confirmed', async () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', name: 'Berry guild', mulchLevel: 1, path: [], plants: [] }];
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

  const wrapper = render(GuildCard, { props: { guildId: 'guild' } });
  await fireEvent.click(wrapper.getByRole('button', { name: 'Delete guild' }));

  expect(confirm).toHaveBeenCalledWith(
    'Delete guild “Berry guild”? This cannot be undone.',
  );
  expect(store.guilds).toEqual([]);
});

it('keeps the guild when deletion is cancelled', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', name: 'Berry guild', mulchLevel: 1, path: [], plants: [] }];

  const wrapper = render(GuildCard, { props: { guildId: 'guild' } });
  await fireEvent.click(wrapper.getByRole('button', { name: 'Delete guild' }));

  expect(store.guilds).toEqual([{ id: 'guild', name: 'Berry guild', mulchLevel: 1, path: [], plants: [] }]);
});

it('does not offer remove-one when there is only one instance', () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      id: 'guild',
      name: 'Bed',
      mulchLevel: 1,
      path: [],
      plants: [baseThing({ id: 'only', plantId: 'plant' })],
    },
  ];

  const wrapper = render(GuildCard, { props: { guildId: 'guild' } });
  expect(wrapper.queryByRole('button', { name: 'Remove one plant from bed' })).toBeNull();
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
      id: 'guild',
      name: 'Bed',
      mulchLevel: 1,
      path: [],
      plants: [dupA, dupB, other],
    },
  ];

  const wrapper = render(GuildCard, { props: { guildId: 'guild' } });
  expect(wrapper.getAllByRole('button', { name: 'Remove one plant from bed' })).toHaveLength(1);

  await fireEvent.click(wrapper.getByRole('button', { name: 'Remove one plant from bed' }));

  expect(store.guilds[0].plants).toEqual([dupA, other]);
});
