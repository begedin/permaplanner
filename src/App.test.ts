import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory } from 'vue-router';
import App from './App.vue';
import { createAppRouter, routeNames } from './router';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';

vi.mock('./usePlanAppGate', () => ({
  showMainApp: { value: true },
}));

vi.mock('./usePlanSession', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./usePlanSession')>();
  return {
    ...actual,
    usePlanSession: () => ({
      load: vi.fn(),
      newPlan: vi.fn(),
      save: vi.fn(),
      saveAs: vi.fn(),
    }),
  };
});

const router = createAppRouter(createMemoryHistory());

beforeEach(async () => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
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

  expect(screen.queryByRole('dialog', { name: 'Plan and sync' })).toBeNull();

  await fireEvent.click(screen.getByRole('button', { name: 'Plan and sync' }));

  expect(screen.getByRole('dialog', { name: 'Plan and sync' })).toBeTruthy();
});

it('shows an unsaved dot on the plan menu button', async () => {
  const store = usePermaplannerStore();
  store.fileHandle = { name: 'plan.json' } as FileSystemFileHandle;
  const coordinator = usePlanSaveCoordinator();
  coordinator.markIntegrationsSaved();
  store.plants.push({
    id: 'p1',
    speciesId: 'comfrey',
    cultivarId: null,
  });
  await flushPromises();
  renderApp();

  expect(
    screen.getByRole('button', { name: 'Plan and sync, unsaved changes' }),
  ).toBeTruthy();
});
