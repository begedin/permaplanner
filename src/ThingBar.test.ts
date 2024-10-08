import { createTestingPinia } from '@pinia/testing';
import { render, cleanup } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ThingBar from './ThingBar.vue';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn }));
});

afterEach(() => cleanup());

it('renders beds', async () => {
  const store = useGardenStore();
  store.gardenBeds = [
    { id: 'bed', name: 'A bed', plantIds: [], path: [] },
    { id: 'bed-2', name: 'Another bed', plantIds: [], path: [] },
  ];
  const wrapper = render(ThingBar);

  expect(await wrapper.findAllByDisplayValue('A bed')).toHaveLength(1);
  expect(await wrapper.findAllByDisplayValue('Another bed')).toHaveLength(1);
});

it('renders plants', async () => {
  const store = useGardenStore();
  store.plants = [
    { id: 'plant-1', name: 'A plant', background: 'bg_1', features: [] },
    { id: 'plant-2', name: 'Another plant', background: 'bg_2', features: [] },
  ];

  store.gardenThings = [
    { id: 'thing-1', name: 'A thing', plantId: 'plant-1', x: 0, y: 0, width: 0, height: 0 },
    { id: 'thing-2', name: 'Another thing', plantId: 'plant-2', x: 0, y: 0, width: 0, height: 0 },
  ];

  const wrapper = render(ThingBar);

  expect(await wrapper.findAllByText('A thing')).toHaveLength(1);
  expect(await wrapper.findAllByText('Another thing')).toHaveLength(1);
});
