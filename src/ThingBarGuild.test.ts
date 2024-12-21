import { cleanup, fireEvent, render, within } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';
import { flushPromises } from '@vue/test-utils';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

afterEach(() => cleanup());

it('renders nothing if no bed in store', async () => {
  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  expect(wrapper.container.textContent).toEqual('');
});

it('adds and removes plants', async () => {
  const store = useGardenStore();
  store.plants = [
    { id: 'plant', name: 'A plant', background: 'bg_1', features: [] },
    { id: 'plant-2', name: 'Another plant', background: 'bg_2', features: [] },
  ];
  store.guilds = [{ id: 'guild', name: 'A guild', plants: [], path: [] }];
  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });

  store.selectedId = 'guild';
  await flushPromises();

  await fireEvent.click(wrapper.getByRole('button', { name: 'A plant' }));
  await fireEvent.click(wrapper.getByRole('button', { name: 'Another plant' }));

  expect(store.guilds[0].plants).toEqual([
    expect.objectContaining({
      id: expect.any(String),
      plant: { id: 'plant', name: 'A plant', background: 'bg_1', features: [] },
      x: 0,
      y: 0,
    }),
    expect.objectContaining({
      id: expect.any(String),
      plant: { id: 'plant-2', name: 'Another plant', background: 'bg_2', features: [] },
      x: 0,
      y: 0,
    }),
  ]);

  const removeButtons = await within(wrapper.getByTestId('bed-plants')).findAllByRole('button');
  expect(removeButtons).toHaveLength(2);
  await fireEvent.click(removeButtons[0]);
  expect(store.guilds[0].plants).toEqual([
    expect.objectContaining({
      id: expect.any(String),
      plant: { id: 'plant-2', name: 'Another plant', background: 'bg_2', features: [] },
      x: 0,
      y: 0,
    }),
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
