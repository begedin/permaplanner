import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, type ComputedRef } from 'vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { createMemoryHistory } from 'vue-router';

import GuildTabHeader from './GuildTabHeader.vue';
import { createAppRouter } from './router';
import {
  createAuthedTestRouter,
  seedAuthedTestSession,
} from './testing/authedTestSession';
import { routeNames, routeParam } from './router';
import { isGardenBootstrapping } from './useGardenSession';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';

vi.mock('./useGardenSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useGardenSession')>();
  return {
    ...actual,
    bootstrapGardenSession: vi.fn().mockResolvedValue(undefined),
  };
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  isGardenBootstrapping.value = false;
});

afterEach(() => cleanup());

const SelectionProbe = defineComponent({
  setup() {
    const { selectedGuildId } = useGuildSelection();
    return { selectedGuildId };
  },
  template:
    '<p :data-selected="selectedGuildId ?? \'none\'">{{ selectedGuildId ?? "none" }}</p>',
});

it('keeps the guild route while the plan session is restoring', async () => {
  isGardenBootstrapping.value = true;
  seedAuthedTestSession();
  const router = createAppRouter(createMemoryHistory());

  await router.push({ name: routeNames.guildsDetail, params: { guildId: 'alpha' } });
  await router.isReady();
  render(SelectionProbe, { global: { plugins: [router] } });
  await flushPromises();

  expect(router.currentRoute.value.name).toBe(routeNames.guildsDetail);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBe('alpha');

  const store = useGardenStore();
  store.guilds = [{ id: 'alpha', name: 'Alpha', path: [], plants: [], mulchLevel: 1 }];
  isGardenBootstrapping.value = false;
  await flushPromises();

  await waitFor(() => {
    expect(screen.getByText('alpha').getAttribute('data-selected')).toBe('alpha');
  });
});

it('clears an unknown guild route after the plan session finishes restoring', async () => {
  isGardenBootstrapping.value = true;
  seedAuthedTestSession();
  const router = createAppRouter(createMemoryHistory());

  await router.push({ name: routeNames.aerialDetail, params: { guildId: 'missing' } });
  await router.isReady();
  render(SelectionProbe, { global: { plugins: [router] } });
  await flushPromises();

  expect(router.currentRoute.value.name).toBe(routeNames.aerialDetail);

  isGardenBootstrapping.value = false;
  await flushPromises();
  await router.isReady();

  expect(router.currentRoute.value.name).toBe(routeNames.aerial);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
});

it('reads the guild route param on the guilds tab', async () => {
  const router = await createAuthedTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'alpha', name: 'Alpha', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: routeNames.guildsDetail, params: { guildId: 'alpha' } });
  await router.isReady();
  render(SelectionProbe, { global: { plugins: [router] } });

  await waitFor(() => {
    expect(screen.getByText('alpha').getAttribute('data-selected')).toBe('alpha');
  });
});

it('reads the guild route param on the aerial tab', async () => {
  const router = await createAuthedTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: routeNames.aerialDetail, params: { guildId: 'g1' } });
  await router.isReady();
  render(SelectionProbe, { global: { plugins: [router] } });

  await waitFor(() => {
    expect(screen.getByText('g1').getAttribute('data-selected')).toBe('g1');
  });
});

it('add guild navigates to the guilds tab with the new guild selected', async () => {
  const router = await createAuthedTestRouter();
  await router.push('/aerial');
  await router.isReady();

  render(GuildTabHeader, {
    props: { title: 'Aerial' },
    global: { plugins: [router] },
  });

  await fireEvent.click(screen.getByRole('button', { name: 'Add guild' }));
  await flushPromises();
  await router.isReady();

  const store = useGardenStore();
  expect(store.guilds).toMatchObject([{ name: 'New guild' }]);
  expect(router.currentRoute.value.name).toBe(routeNames.guildsDetail);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBe(
    store.guilds[0]!.id,
  );
});

it('points the guilds tab link at the selected guild from aerial', async () => {
  const router = await createAuthedTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: routeNames.aerialDetail, params: { guildId: 'g1' } });
  await router.isReady();

  let guildsTabTo!: ComputedRef<
    ReturnType<typeof useGuildSelection>['guildsTabTo']['value']
  >;
  let aerialTabTo!: ComputedRef<
    ReturnType<typeof useGuildSelection>['aerialTabTo']['value']
  >;

  const CrossTabProbe = defineComponent({
    setup() {
      const selection = useGuildSelection();
      guildsTabTo = selection.guildsTabTo;
      aerialTabTo = selection.aerialTabTo;
      return () => null;
    },
  });

  render(CrossTabProbe, { global: { plugins: [router] } });
  expect(guildsTabTo.value).toEqual({
    name: routeNames.guildsDetail,
    params: { guildId: 'g1' },
  });
  expect(aerialTabTo.value).toEqual({
    name: routeNames.aerialDetail,
    params: { guildId: 'g1' },
  });
});

it('points the aerial tab link at the selected guild from guilds', async () => {
  const router = await createAuthedTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: routeNames.guildsDetail, params: { guildId: 'g1' } });
  await router.isReady();

  let guildsTabTo!: ComputedRef<
    ReturnType<typeof useGuildSelection>['guildsTabTo']['value']
  >;
  let aerialTabTo!: ComputedRef<
    ReturnType<typeof useGuildSelection>['aerialTabTo']['value']
  >;

  const CrossTabProbe = defineComponent({
    setup() {
      const selection = useGuildSelection();
      guildsTabTo = selection.guildsTabTo;
      aerialTabTo = selection.aerialTabTo;
      return () => null;
    },
  });

  render(CrossTabProbe, { global: { plugins: [router] } });
  expect(guildsTabTo.value).toEqual({
    name: routeNames.guildsDetail,
    params: { guildId: 'g1' },
  });
  expect(aerialTabTo.value).toEqual({
    name: routeNames.aerialDetail,
    params: { guildId: 'g1' },
  });
});
