import { cleanup, fireEvent, render } from '@testing-library/vue';
import { nextTick } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import GuildCard from './GuildCard.vue';
import type { GardenThing, Guild } from './gardenTypes';
import { useGardenStore } from './useGardenStore';

const testGuild = {
  id: 'guild',
  name: 'Berry guild',
  mulchLevel: 1,
  path: [],
  plants: [],
} satisfies Guild;

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  const store = useGardenStore();
  store.guilds = [{ ...testGuild, plants: [] }];
  store.plants = [];
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

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

it('updates guild name from the name input', () => {
  const store = useGardenStore();
  store.guilds[0]!.name = 'Old';
  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });
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
      ...testGuild,
      name: 'Bed',
      plants: [first, second],
    },
  ];

  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });
  await fireEvent.click(
    wrapper.getByRole('button', { name: 'Remove one plant from bed' }),
  );

  expect(store.guilds[0].plants).toEqual([first]);
});

it('deletes the guild when confirmed', async () => {
  const store = useGardenStore();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });
  wrapper.getByRole('button', { name: 'Delete' }).click();

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

  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });
  await fireEvent.click(wrapper.getByRole('button', { name: 'Delete' }));

  expect(store.guilds).toEqual([{ ...testGuild, plants: [] }]);
});

it('does not offer remove-one when there is only one instance', () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      ...testGuild,
      name: 'Bed',
      plants: [baseThing({ id: 'only', plantId: 'plant' })],
    },
  ];

  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });
  expect(wrapper.queryByRole('button', { name: 'Remove one plant from bed' })).toBeNull();
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

  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });

  expect(wrapper.getByLabelText('Guild size on aerial map').textContent).toBe(
    '1.00×0.77',
  );
  expect(
    wrapper.getByRole('button', { name: 'Remove from aerial map' }).textContent?.trim(),
  ).toBe('⊖');

  await fireEvent.click(wrapper.getByRole('button', { name: 'Remove from aerial map' }));

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

  const wrapper = render(GuildCard, { props: { context: 'guilds', guildId: 'guild' } });
  expect(
    wrapper.getAllByRole('button', { name: 'Remove one plant from bed' }),
  ).toHaveLength(1);

  await fireEvent.click(
    wrapper.getByRole('button', { name: 'Remove one plant from bed' }),
  );

  expect(store.guilds[0].plants).toEqual([dupA, other]);
});
