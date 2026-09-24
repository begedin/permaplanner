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
import { useGardenSessionStore } from './stores/useGardenSessionStore';

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
  useGardenSessionStore().isBootstrapping = false;
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

  expect(screen.queryByRole('dialog', { name: 'Plan' })).not.toBeInTheDocument();

  await fireEvent.click(screen.getByRole('button', { name: 'Plan' }));

  await waitFor(() => {
    expect(screen.getByRole('dialog', { name: 'Plan' })).toBeVisible();
  });
});

it('shows an unsaved dot on the plan menu button', async () => {
  vi.mocked(gardensApi.updateGarden).mockImplementation(() => new Promise(() => {}));

  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  store.gardenName = 'plan.json';
  const gardenSession = useGardenSessionStore();
  gardenSession.markSaved();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });

  renderApp();

  await waitFor(() => {
    expect(screen.getByRole('button', { name: 'Plan, unsaved changes' })).toBeVisible();
  });
});

it('prompts on page unload only while the plan has unsaved changes', async () => {
  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  const gardenSession = useGardenSessionStore();
  gardenSession.markSaved();
  const view = renderApp();
  const clean = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  store.backgroundOpacity = 0.7;
  const dirty = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
  view.unmount();
  const unmounted = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unmounted);
  expect(unmounted.defaultPrevented).toBe(false);
});

it('allows garden view changes but prompts before leaving for import', async () => {
  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  useGardenSessionStore().markSaved();
  store.backgroundOpacity = 0.7;
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await router.push('/aerial');
  expect(router.currentRoute.value.name).toBe(routeNames.aerial);
  expect(confirm).not.toHaveBeenCalled();
  await router.push('/import');
  expect(router.currentRoute.value.name).toBe(routeNames.aerial);
  expect(confirm).toHaveBeenCalledTimes(1);
  confirm.mockReturnValue(true);
  await router.push('/import');
  expect(router.currentRoute.value.name).toBe(routeNames.import);
  confirm.mockRestore();
});
