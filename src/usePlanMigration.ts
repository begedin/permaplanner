import { ref } from 'vue';

import { documentNeedsMigration, readDocumentVersion } from './permaplannerFileMigrate';

export type PlanMigrationPending = {
  localFromVersion?: number;
};

export const planMigrationPending = ref<PlanMigrationPending | null>(null);
export const planMigrationInFlight = ref(false);
export const planMigrationError = ref<string | undefined>();

export const hasPlanMigrationPending = (pending: PlanMigrationPending | null): boolean =>
  pending !== null && pending.localFromVersion !== undefined;

export const isPlanMigrationPending = ref(false);

export const clearPlanMigrationPending = (): void => {
  planMigrationPending.value = null;
  planMigrationError.value = undefined;
  isPlanMigrationPending.value = false;
};

export const noteLocalPlanMigrationIfNeeded = (raw: unknown): void => {
  if (!documentNeedsMigration(raw)) {
    if (planMigrationPending.value?.localFromVersion !== undefined) {
      planMigrationPending.value = null;
      isPlanMigrationPending.value = false;
    }
    return;
  }
  planMigrationPending.value = { localFromVersion: readDocumentVersion(raw) };
  isPlanMigrationPending.value = true;
};

/** Legacy GitHub shard migration checks removed — import migrates client-side. */
export const checkGithubPlanMigration = async (_fileName: string | undefined): Promise<void> => {
  return;
};

export const performPlanMigration = async (): Promise<void> => {
  clearPlanMigrationPending();
};
