import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import { expect, it, vi } from 'vitest';
import * as authApi from './api/auth';
import * as gardensApi from './api/gardens';
import { createAppRouter } from './router';
import { createEmptyPlanState } from './planSavableState';
import { GARDEN_DOCUMENT_VERSION } from './gardenDocument';
import { useGardenSessionStore } from './stores/useGardenSessionStore';

vi.mock('./api/auth');
vi.mock('./api/gardens');

it('bootstraps before validating a guild deep link without mounting App', async () => {
  setActivePinia(createPinia());
  localStorage.clear();
  vi.mocked(authApi.fetchSession).mockResolvedValue({
    id: 'user',
    email: 'user@example.com',
    totpConfirmed: true,
  });
  const summary = {
    id: 'garden',
    name: 'Garden',
    syncRevision: 0,
    updatedAt: '2026-01-01',
  };
  vi.mocked(gardensApi.listGardens).mockResolvedValue([summary]);
  const { backgroundImageDataUrl: _image, ...plan } = createEmptyPlanState();
  vi.mocked(gardensApi.fetchGarden).mockResolvedValue({
    ...summary,
    insertedAt: summary.updatedAt,
    fileVersion: GARDEN_DOCUMENT_VERSION,
    document: {
      ...plan,
      version: GARDEN_DOCUMENT_VERSION,
      syncRevision: 0,
      guilds: [{ id: 'bed', name: 'Bed', path: [], plants: [], mulchLevel: 1 }],
    },
  });
  const router = createAppRouter(createMemoryHistory());
  await router.push('/guilds/bed');
  expect(router.currentRoute.value.path).toBe('/guilds/bed');
  expect(useGardenSessionStore()).toMatchObject({
    isBootstrapping: false,
    gardens: [summary],
  });
  await router.push('/guilds/missing');
  expect(router.currentRoute.value.path).toBe('/guilds');
  expect(authApi.fetchSession).toHaveBeenCalledTimes(1);
  expect(gardensApi.fetchGarden).toHaveBeenCalledTimes(1);
});
