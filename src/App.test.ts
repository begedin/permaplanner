import { usePlanStateStore } from './usePlanStateStore';
import { computed } from 'vue';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory } from 'vue-router';

import * as gardensApi from './api/gardens';
import { ApiError } from './api/client';
import App from './App.vue';
import { createAppRouter, routeNames } from './router';
import { seedAuthedTestSession } from './testing/authedTestSession';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { useAuthStore } from './stores/useAuthStore';

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

  useGardenSessionStore().gardenId = 'g1';
  useGardenSessionStore().gardenName = 'plan.json';
  const gardenSession = useGardenSessionStore();
  gardenSession.markSaved();
  usePlanCommandHistory().runMutation(() => {
    usePlanStateStore().state.plants.push({
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
  useGardenSessionStore().gardenId = 'g1';
  const gardenSession = useGardenSessionStore();
  gardenSession.markSaved();
  const view = renderApp();
  const clean = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  usePlanStateStore().state.backgroundOpacity = 0.7;
  const dirty = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(dirty);
  expect(dirty.defaultPrevented).toBe(true);
  view.unmount();
  const unmounted = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unmounted);
  expect(unmounted.defaultPrevented).toBe(false);
});

it('shows a dismissible save failure toast, shows it again on failure, and retries', async () => {
  vi.mocked(useAuthStore().bootstrap).mockResolvedValue();
  useGardenSessionStore().gardenId = 'g1';
  const session = useGardenSessionStore();
  session.markSaved();
  usePlanStateStore().state.backgroundOpacity = 0.7;
  vi.mocked(gardensApi.updateGarden)
    .mockRejectedValueOnce(new ApiError(502, {}))
    .mockRejectedValueOnce(new ApiError(502, {}))
    .mockResolvedValueOnce(1);
  renderApp();

  await fireEvent.click(await screen.findByRole('button', { name: 'Save' }));
  await waitFor(() => {
    expect(screen.getByRole('alert', { name: 'Garden save failed' })).toHaveTextContent(
      'Your garden could not be saved. Your changes are still here. Please try again.',
    );
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Dismiss save error' }));
  expect(
    screen.queryByRole('alert', { name: 'Garden save failed' }),
  ).not.toBeInTheDocument();
  expect(session).toMatchObject({ canSave: true, hasUnsavedChanges: true });

  await fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => {
    expect(screen.getByRole('alert', { name: 'Garden save failed' })).toBeVisible();
  });
  await fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
  await waitFor(() => {
    expect(
      screen.queryByRole('alert', { name: 'Garden save failed' }),
    ).not.toBeInTheDocument();
    expect(session.status).toBe('saved');
  });
});

it('allows garden view changes but prompts before leaving for import', async () => {
  useGardenSessionStore().gardenId = 'g1';
  useGardenSessionStore().markSaved();
  usePlanStateStore().state.backgroundOpacity = 0.7;
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  await router.push('/guilds');
  expect(router.currentRoute.value.name).toBe(routeNames.guilds);
  expect(confirm).not.toHaveBeenCalled();
  await router.push('/import');
  expect(router.currentRoute.value.name).toBe(routeNames.guilds);
  expect(confirm).toHaveBeenCalledTimes(1);
  confirm.mockReturnValue(true);
  await router.push('/import');
  expect(router.currentRoute.value.name).toBe(routeNames.import);
  confirm.mockRestore();
});
