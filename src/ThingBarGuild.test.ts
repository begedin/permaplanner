import { cleanup, fireEvent, render } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

it('throws if no guild in store', () => {
  expect(() => render(ThingBarGuild, { props: { id: 'guild' } })).toThrow(
    'Guild not found: guild',
  );
});

it('shows guild name, compact plant tags, and season section', () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      mulchLevel: 1,
      plants: [
        {
          plantId: 'plant',
          height: 10,
          width: 10,
          x: 0,
          y: 0,
          id: '1',
          nameOrCultivar: 'Comfrey',
        },
      ],
      path: [],
    },
  ];
  store.selectedId = 'guild';

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  expect(wrapper.getByText('A guild')).toBeTruthy();
  expect(wrapper.getByLabelText('Plants in this guild').textContent).toContain('Comfrey');
  expect(wrapper.getByLabelText('Guild fruit and bloom by month')).toBeTruthy();
});

it('marks the card as current when this guild is selected on the map', () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      mulchLevel: 1,
      plants: [
        {
          plantId: 'plant',
          height: 10,
          width: 10,
          x: 0,
          y: 0,
          id: '1',
          nameOrCultivar: 'Comfrey',
        },
      ],
      path: [],
    },
  ];
  store.selectedId = 'guild';

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  expect(
    wrapper.getByRole('article', { name: 'A guild' }).getAttribute('aria-current'),
  ).toBe('true');
});

it('shows map size and icon remove when the guild is placed on the aerial map', async () => {
  const store = useGardenStore();
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      mulchLevel: 1,
      plants: [],
      path: [
        { x: 0, y: 0 },
        { x: 130, y: 100 },
      ],
    },
  ];

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });

  expect(wrapper.getByLabelText('Guild size on aerial map').textContent).toBe(
    '1.00×0.77',
  );
  expect(
    wrapper.getByRole('button', { name: 'Remove from aerial map' }).textContent?.trim(),
  ).toBe('⊖');
});

it('selects the guild when the card is clicked', async () => {
  const store = useGardenStore();
  store.plants = [{ id: 'plant', speciesId: 'comfrey', cultivarId: null }];
  store.guilds = [
    {
      id: 'guild',
      name: 'A guild',
      mulchLevel: 1,
      plants: [
        {
          plantId: 'plant',
          height: 10,
          width: 10,
          x: 0,
          y: 0,
          id: '1',
          nameOrCultivar: 'Comfrey',
        },
      ],
      path: [],
    },
  ];

  const wrapper = render(ThingBarGuild, { props: { id: 'guild' } });
  await fireEvent.click(wrapper.getByRole('article', { name: 'A guild' }));

  expect(store.selectedId).toBe('guild');
});
