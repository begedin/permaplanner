import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

import * as gardensApi from './api/gardens';
import { resetPlanSaveSerialQueueForTests } from './planSaveSerialQueue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
import { useAuthStore } from './stores/useAuthStore';

vi.mock('./api/gardens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api/gardens')>();
  return {
    ...actual,
    updateGarden: vi.fn(),
    listGardens: vi.fn().mockResolvedValue([]),
  };
});

beforeEach(() => {
  setActivePinia(createPinia());
  resetPlanSaveSerialQueueForTests();
  useAuthStore().user = { id: 'u1', email: 't@example.com', totpConfirmed: true };
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(gardensApi.updateGarden).mockReset();
});

it('autosaves to server after edit', async () => {
  vi.mocked(gardensApi.updateGarden).mockResolvedValue(1);

  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  store.gardenName = 'garden.json';

  const coordinator = usePlanSaveCoordinator();
  coordinator.markIntegrationsSaved();

  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });
  await flushPromises();

  expect(gardensApi.updateGarden).toHaveBeenCalledTimes(1);
  expect(coordinator.views.find((v) => v.id === 'server')?.status).toBe('saved');
});

it('does not mark server unsaved before markIntegrationsSaved', () => {
  const store = usePermaplannerStore();
  store.gardenId = 'g1';

  const coordinator = usePlanSaveCoordinator();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });

  expect(coordinator.hasUnsavedChanges).toBe(false);
});

it('saveAllLinkedIntegrations forces server save', async () => {
  vi.mocked(gardensApi.updateGarden).mockResolvedValue(0);

  const store = usePermaplannerStore();
  store.gardenId = 'g1';

  const coordinator = usePlanSaveCoordinator();
  coordinator.markIntegrationsSaved();

  await coordinator.saveAllLinkedIntegrations();

  expect(gardensApi.updateGarden).toHaveBeenCalledTimes(1);
});
