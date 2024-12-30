import { cleanup, fireEvent, render, within } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';
import { flushPromises } from '@vue/test-utils';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

it('renders nothing if no bed in store', async () => {
  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  expect(wrapper.container.textContent).toEqual('');
});

it('adds and removes plants', async () => {
  const store = useGardenStore();
  store.plants = [
    {
      id: 'plant',
      name: 'A plant',
      background: 'bg_1',
      features: [],
      functions: [],
      layers: [],
    },
    {
      id: 'plant-2',
      name: 'Another plant',
      background: 'bg_2',
      features: [],
      functions: [],
      layers: [],
    },
  ];
  store.guilds = [{ id: 'guild', name: 'A guild', plants: [], path: [] }];
  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });

  store.selectedId = 'guild';
  await flushPromises();

  const plantsNotInGuild = wrapper.getByLabelText('Plants not in this guild');
  await fireEvent.click(
    within(plantsNotInGuild).getByRole('button', { name: 'A plant' }),
  );
  await fireEvent.click(
    within(plantsNotInGuild).getByRole('button', { name: 'Another plant' }),
  );

  expect(store.guilds[0].plants).toEqual([
    expect.objectContaining({ plantId: 'plant' }),
    expect.objectContaining({ plantId: 'plant-2' }),
  ]);

  const plantsInGuild = wrapper.getByLabelText('Plants in this guild');
  const plant1Button = await within(plantsInGuild).findByLabelText('A plant');
  expect(plant1Button).toBeTruthy();

  const plant2Button = await within(plantsInGuild).findByLabelText('Another plant');
  expect(plant2Button).toBeTruthy();

  await fireEvent.click(
    within(plant1Button).getByRole('button', { name: 'Remove plant from bed' }),
  );
  expect(store.guilds[0].plants).toEqual([
    expect.objectContaining({ plantId: 'plant-2' }),
  ]);
});

it('renames', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', name: 'A guild', plants: [], path: [] }];
  store.selectedId = 'guild';

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  fireEvent.update(wrapper.getByRole('textbox'), 'New name');

  expect(store.guilds[0].name).toEqual('New name');
});

it('shows layers', () => {
  const store = useGardenStore();
  store.plants = [
    {
      id: 'plant',
      name: 'A tree',
      background: 'bg_1',
      features: [],
      functions: [],
      layers: ['overstory', 'understory'],
    },
    {
      id: 'plant-2',
      name: 'A small tree',
      background: 'bg_2',
      features: [],
      functions: [],
      layers: ['understory'],
    },
  ];
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      plants: [
        { plantId: 'plant', height: 10, width: 10, x: 0, y: 0, id: '1' },
        { plantId: 'plant-2', height: 10, width: 10, x: 0, y: 0, id: ' 2' },
      ],
      path: [],
    },
  ];
  store.selectedId = 'guild';

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  expect(wrapper.getAllByLabelText('Overstory')).toHaveLength(1);
  expect(wrapper.getAllByLabelText('Understory')).toHaveLength(1);
  expect(wrapper.getByLabelText('Understory').textContent).toContain('2');
});

it('shows functions', () => {
  const store = useGardenStore();
  store.plants = [
    {
      id: 'apple',
      name: 'Apple',
      background: 'bg_1',
      features: [],
      functions: ['edible', 'medicinal'],
      layers: [],
    },
    {
      id: 'parsley',
      name: 'Parsley',
      background: 'bg_2',
      features: [],
      functions: ['edible', 'medicinal'],
      layers: [],
    },
  ];
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      plants: [
        { plantId: 'apple', height: 10, width: 10, x: 0, y: 0, id: '1' },
        { plantId: 'parsley', height: 10, width: 10, x: 0, y: 0, id: '2' },
      ],
      path: [],
    },
  ];

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  expect(wrapper.getAllByLabelText('Edible')).toHaveLength(1);
  expect(wrapper.getAllByLabelText('Medicinal')).toHaveLength(1);
  expect(wrapper.getByLabelText('Edible').textContent).toContain('2');
});
