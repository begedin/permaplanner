import { createMemoryHistory, type Router } from 'vue-router';

import { createAppRouter } from '../router';
import { useAuthStore } from '../stores/useAuthStore';
import { useGardenSessionStore } from '../stores/useGardenSessionStore';
import { isGardenBootstrapping } from '../useGardenSession';

export const seedAuthedTestSession = () => {
  const auth = useAuthStore();
  auth.bootstrapping = false;
  auth.user = { id: 'u1', email: 'test@example.com', totpConfirmed: true };

  const gardenSession = useGardenSessionStore();
  gardenSession.gardens = [
    { id: 'g1', name: 'Garden', syncRevision: 0, updatedAt: '2026-01-01T00:00:00.000Z' },
  ];
};

export const createAuthedTestRouter = async (initialPath = '/guilds'): Promise<Router> => {
  seedAuthedTestSession();
  isGardenBootstrapping.value = false;
  const router = createAppRouter(createMemoryHistory());
  await router.push(initialPath);
  await router.isReady();
  return router;
};
