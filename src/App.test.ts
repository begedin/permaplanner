import { computed } from 'vue';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory } from 'vue-router';

import * as gardensApi from './api/gardens';
import App from './App.vue';
import { createAppRouter, routeNames } from './router';
import { seedAuthedTestSession } from './testing/authedTestSession';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
import { isGardenBootstrapping } from './useGardenSession';

vi.mock('./useAuthGate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./useAuthGate')>();
  return {
    ...actual,
    showMainApp: computed(() => true),
  };
});

const router = createAppRouter(createMemoryHistory());

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  seedAuthedTestSession();
  isGardenBootstrapping.value = false;
  vi.mocked(gardensApi.updateGarden).mockReset();
  await router.push({ name: routeNames.guilds });
  await router.isReady();
});

afterEach(() => cleanup());

const renderApp = () =>
  render(App, {
    global: {
      plugins: [router],
    },
  });

it('opens the plan drawer from the top bar icon', async () => {
  renderApp();

  expect(screen.queryByRole('dialog', { name: 'Plan and sync' })).not.toBeInTheDocument();

  await fireEvent.click(screen.getByRole('button', { name: 'Plan and sync' }));

  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Plan and sync' })).toBeVisible();
  });
});

it('shows an unsaved dot on the plan menu button', async () => {
  vi.mocked(gardensApi.updateGarden).mockImplementation(() => new Promise(() => {}));

  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  store.gardenName = 'plan.json';
  const coordinator = usePlanSaveCoordinator();
  coordinator.markSaved();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });

  renderApp();

  await waitFor(() => {
    expect(
      screen.getByRole('button', { name: 'Plan and sync, unsaved changes' }),
    ).toBeVisible();
  });
});
