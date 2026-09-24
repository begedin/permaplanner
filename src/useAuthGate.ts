import { computed } from 'vue';

import { useAuthStore } from './stores/useAuthStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';

export type AuthGateMode = 'loading' | 'ready';

export const authGateMode = computed((): AuthGateMode | null => {
  const auth = useAuthStore();
  const gardenSession = useGardenSessionStore();
  if (auth.bootstrapping || gardenSession.isBootstrapping) {
    return 'loading';
  }
  if (!auth.user?.totpConfirmed) {
    return null;
  }
  return 'ready';
});

export const showMainApp = computed(() => authGateMode.value === 'ready');

export const needsGardenSetup = computed(() => {
  const auth = useAuthStore();
  const gardenSession = useGardenSessionStore();
  if (auth.bootstrapping || gardenSession.isBootstrapping || !auth.user?.totpConfirmed) {
    return false;
  }
  return gardenSession.gardens.length === 0;
});
