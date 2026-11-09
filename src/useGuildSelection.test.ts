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
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  const gardenSession = useGardenSessionStore();
  gardenSession.isBootstrapping = false;
  vi.spyOn(gardenSession, 'bootstrap').mockResolvedValue();
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

it.each([true, false])(
  'waits for restoration before resolving a guild route (exists: %s)',
  async (exists) => {
    seedAuthedTestSession();
    const session = useGardenSessionStore();
    session.isBootstrapping = true;
    let finish!: () => void;
    vi.mocked(session.bootstrap).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const router = createAppRouter(createMemoryHistory());
    const navigation = router.push({
      name: routeNames.guildsDetail,
      params: { guildId: 'alpha' },
    });
    await flushPromises();
    expect(session.bootstrap).toHaveBeenCalledTimes(1);
    if (exists)
      useGardenStore().guilds = [
        { id: 'alpha', name: 'Alpha', path: [], plants: [], mulchLevel: 1 },
      ];
    session.isBootstrapping = false;
    finish();
    await navigation;
    expect(router.currentRoute.value).toMatchObject({
      name: exists ? routeNames.guildsDetail : routeNames.guilds,
      params: exists ? { guildId: 'alpha' } : {},
    });
  },
);

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

it('add guild navigates to the guilds tab with the new guild selected', async () => {
  const router = await createAuthedTestRouter();
  await router.push('/guilds');
  await router.isReady();

  render(GuildTabHeader, {
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

it('points the guilds tab link at the selected guild in the combined view', async () => {
  const router = await createAuthedTestRouter();
  const store = useGardenStore();
  store.guilds = [{ id: 'g1', name: 'Bed', path: [], plants: [], mulchLevel: 1 }];

  await router.push({ name: routeNames.guildsDetail, params: { guildId: 'g1' } });
  await router.isReady();

  let guildsTabTo!: ComputedRef<
    ReturnType<typeof useGuildSelection>['guildsTabTo']['value']
  >;
  const CrossTabProbe = defineComponent({
    setup() {
      const selection = useGuildSelection();
      guildsTabTo = selection.guildsTabTo;
      return () => null;
    },
  });

  render(CrossTabProbe, { global: { plugins: [router] } });
  expect(guildsTabTo.value).toEqual({
    name: routeNames.guildsDetail,
    params: { guildId: 'g1' },
  });
});
