import { cleanup, fireEvent, render, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import ThingBarGuild from './ThingBarGuild.vue';
import { createAuthedTestRouter } from './testing/authedTestSession';
import { routeNames, routeParam } from './router';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

const renderOnAerial = async () => {
  const router = await createAuthedTestRouter('/aerial');
  return router;
};

afterEach(() => cleanup());

it('throws if no guild in store', async () => {
  const router = await renderOnAerial();
  expect(() =>
    render(ThingBarGuild, { props: { id: 'guild' }, global: { plugins: [router] } }),
  ).toThrow('Guild not found: guild');
});

it('shows guild name, compact plant tags, and season section', async () => {
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
  const router = await renderOnAerial();
  await router.push({ name: routeNames.aerialDetail, params: { guildId: 'guild' } });

  const wrapper = render(ThingBarGuild, {
    props: { id: 'guild' },
    global: { plugins: [router] },
  });
  await waitFor(() => {
    expect(wrapper.getByText('A guild')).toBeVisible();
    expect(wrapper.getByLabelText('Plants in this guild').textContent).toContain(
      'Comfrey',
    );
    expect(wrapper.getByLabelText('Guild fruit and bloom by month')).toBeVisible();
  });
});

it('marks the card as current when this guild is selected on the map', async () => {
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
  const router = await renderOnAerial();
  await router.push({ name: routeNames.aerialDetail, params: { guildId: 'guild' } });

  const wrapper = render(ThingBarGuild, {
    props: { id: 'guild' },
    global: { plugins: [router] },
  });
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

  const router = await renderOnAerial();
  const wrapper = render(ThingBarGuild, {
    props: { id: 'guild' },
    global: { plugins: [router] },
  });

  expect(wrapper.getByLabelText('Guild size on aerial map').textContent).toBe(
    '1.00×0.77',
  );
  expect(
    wrapper.getByRole('button', { name: 'Remove from aerial map' }).querySelector('svg'),
  ).toBeTruthy();
});

it('selects the guild in the aerial route when the card is clicked', async () => {
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

  const router = await renderOnAerial();
  const wrapper = render(ThingBarGuild, {
    props: { id: 'guild' },
    global: { plugins: [router] },
  });
  await fireEvent.click(await wrapper.findByRole('article', { name: 'A guild' }));
  await flushPromises();
  await router.isReady();

  expect(router.currentRoute.value.name).toBe(routeNames.aerialDetail);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBe('guild');
});
