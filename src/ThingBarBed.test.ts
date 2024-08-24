import { cleanup, fireEvent, render, within } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import ThingBarBed from './ThingBarBed.vue';
import { useGardenStore } from './useGardenStore';
import { flushPromises } from '@vue/test-utils';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

afterEach(() => cleanup());

it('renders nothing if no bed in store', async () => {
  const wrapper = render(ThingBarBed, { props: { id: 'bed' } });
  expect(wrapper.container.textContent).toEqual('');
});

it('adds and removes plants', async () => {
  const store = useGardenStore();
  store.plants = [
    { id: 'plant', name: 'A plant', background: 'bg_1', features: [] },
    { id: 'plant-2', name: 'Another plant', background: 'bg_2', features: [] },
  ];
  store.gardenBeds = [{ id: 'bed', name: 'A bed', plantIds: [], path: [] }];
  const wrapper = render(ThingBarBed, { props: { id: 'bed' } });

  store.selectedId = 'bed';
  await flushPromises();

  await fireEvent.click(wrapper.getByRole('button', { name: 'A plant' }));
  await fireEvent.click(wrapper.getByRole('button', { name: 'Another plant' }));

  expect(store.gardenBeds[0].plantIds).toEqual(['plant', 'plant-2']);

  const removeButtons = await within(wrapper.getByTestId('bed-plants')).findAllByRole('button');
  expect(removeButtons).toHaveLength(2);
  await fireEvent.click(removeButtons[0]);
  expect(store.gardenBeds[0].plantIds).toEqual(['plant-2']);
});

it('renames', () => {
  const store = useGardenStore();
  store.gardenBeds = [{ id: 'bed', name: 'A bed', plantIds: [], path: [] }];
  store.selectedId = 'bed';

  const wrapper = render(ThingBarBed, { props: { id: 'bed' } });
  fireEvent.input(wrapper.getByRole('textbox'), { target: { value: 'New name' } });

  expect(store.gardenBeds[0].name).toEqual('New name');
});
