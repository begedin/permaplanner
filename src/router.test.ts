import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import { expect, it, vi } from 'vitest';
import * as authApi from './api/auth';
import * as gardensApi from './api/gardens';
import { rectangleShapePath } from './mapShapeGeometry';
import { createAppRouter } from './router';
import { createEmptyPlanState } from './planSavableState';
import { GARDEN_DOCUMENT_VERSION } from './gardenDocument';
import { useGardenSessionStore } from './stores/useGardenSessionStore';

vi.mock('./api/auth');
vi.mock('./api/gardens');

it.each(['/guilds/bed', '/guilds/bed/layout'])(
  'bootstraps before validating deep link %s without mounting App',
  async (path) => {
    vi.clearAllMocks();
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
        guilds: [
          {
            id: 'bed',
            name: 'Bed',
            path: rectangleShapePath(),
            plants: [],
            mulchLevel: 1,
          },
          { id: 'unmapped', name: 'Unmapped', path: [], plants: [], mulchLevel: 1 },
        ],
      },
    });
    const router = createAppRouter(createMemoryHistory());
    await router.push(path);
    expect(router.currentRoute.value.path).toBe(path);
    if (path.endsWith('/layout')) {
      expect(router.currentRoute.value.matched.map((record) => record.path)).toEqual([
        '/guilds',
        '/guilds/:guildId',
        '/guilds/:guildId/layout',
      ]);
    }
    expect(useGardenSessionStore()).toMatchObject({
      isBootstrapping: false,
      gardens: [summary],
    });
    await router.push('/guilds/missing');
    expect(router.currentRoute.value.path).toBe('/guilds');
    await router.push('/guilds/missing/layout');
    expect(router.currentRoute.value.path).toBe('/guilds');
    await router.push('/guilds/unmapped/layout');
    expect(router.currentRoute.value.path).toBe('/guilds/unmapped');
    expect(authApi.fetchSession).toHaveBeenCalledTimes(1);
    expect(gardensApi.fetchGarden).toHaveBeenCalledTimes(1);
  },
);
