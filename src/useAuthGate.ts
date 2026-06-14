import { computed } from 'vue';

import { useAuthStore } from './stores/useAuthStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { isGardenBootstrapping } from './useGardenSession';

export type AuthGateMode = 'loading' | 'ready';

export const authGateMode = computed((): AuthGateMode | null => {
  const auth = useAuthStore();
  if (auth.bootstrapping || isGardenBootstrapping.value) {
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
  if (auth.bootstrapping || isGardenBootstrapping.value || !auth.user?.totpConfirmed) {
    return false;
  }
  return useGardenSessionStore().gardens.length === 0;
});
