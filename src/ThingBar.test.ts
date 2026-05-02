import { createTestingPinia } from '@pinia/testing';
import { render, cleanup } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ThingBar from './ThingBar.vue';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

it('renders guilds', async () => {
  const store = useGardenStore();
  store.plants = [
    { id: 'plant-1', speciesId: 'apple', cultivarId: 'granny_smith' },
    { id: 'plant-2', speciesId: 'apple', cultivarId: 'fuji' },
  ];
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      mulchLevel: 1,
      plants: [
        {
          id: 'plant-1',
          plantId: 'plant-1',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          nameOrCultivar: 'Apple',
        },
      ],
      path: [],
    },
    {
      id: 'guild-2',
      name: 'Another guild',
      mulchLevel: 1,
      plants: [
        {
          id: 'plant-2',
          plantId: 'plant-2',
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          nameOrCultivar: 'Granny Smith',
        },
      ],
      path: [],
    },
  ];
  const wrapper = render(ThingBar);

  expect(await wrapper.findAllByDisplayValue('A guild')).toHaveLength(1);
  expect(await wrapper.findAllByDisplayValue('Another guild')).toHaveLength(1);
});
