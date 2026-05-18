import { computed } from 'vue';

import { isGithubStorageLinked } from './githubRepoSync';
import { isPlanMigrationPending } from './usePlanMigration';
import { awaitingReopenFileClick, isRestoringSession } from './usePlanSession';
import { usePermaplannerStore } from './usePermaplannerStore';

export type PlanAppGateMode = 'loading' | 'migration' | 'setup';

export const isPlanStorageReady = computed(() => {
  const store = usePermaplannerStore();
  if (awaitingReopenFileClick.value || store.needsFileRelink) {
    return false;
  }
  if (store.fileName) {
    return true;
  }
  return isGithubStorageLinked();
});

export const planAppGateMode = computed((): PlanAppGateMode | null => {
  if (isRestoringSession.value) {
    return 'loading';
  }
  if (isPlanMigrationPending.value) {
    return 'migration';
  }
  if (!isPlanStorageReady.value) {
    return 'setup';
  }
  return null;
});

export const showMainApp = computed(() => planAppGateMode.value === null);
