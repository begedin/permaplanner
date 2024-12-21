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
  store.guilds = [{ id: 'guild', name: 'A guild', plantIds: [], path: [] }];
  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });

  store.selectedId = 'guild';
  await flushPromises();

  await fireEvent.click(wrapper.getByRole('button', { name: 'A plant' }));
  await fireEvent.click(wrapper.getByRole('button', { name: 'Another plant' }));

  expect(store.guilds[0].plantIds).toEqual(['plant', 'plant-2']);

  const removeButtons = await within(wrapper.getByTestId('bed-plants')).findAllByRole('button');
  expect(removeButtons).toHaveLength(2);
  await fireEvent.click(removeButtons[0]);
  expect(store.guilds[0].plantIds).toEqual(['plant-2']);
});

it('renames', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', name: 'A guild', plantIds: [], path: [] }];
  store.selectedId = 'guild';

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  fireEvent.update(wrapper.getByRole('textbox'), 'New name');

  expect(store.guilds[0].name).toEqual('New name');
});
