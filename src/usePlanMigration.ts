import { computed, ref } from 'vue';

import {
  getGithubAccessToken,
  planRepoSyncUpdatedEventName,
  pushPlanJsonToGithubRepo,
  readGithubClientIdConfig,
  scanGithubPlanShardsForMigration,
} from './githubRepoSync';
import {
  documentNeedsMigration,
  readDocumentVersion,
  type GithubShardMigrationVersions,
} from './permaplannerFileMigrate';
import { runPlanSaveSerial } from './planSaveSerialQueue';
import { usePermaplannerStore } from './usePermaplannerStore';

export type { GithubShardMigrationVersions };

export type PlanMigrationPending = {
  /** Stored file version when local JSON is below current. */
  localFromVersion?: number;
  github?: GithubShardMigrationVersions;
};

export const planMigrationPending = ref<PlanMigrationPending | null>(null);
export const planMigrationInFlight = ref(false);
export const planMigrationError = ref<string | undefined>();

const githubShardPending = (github: GithubShardMigrationVersions | undefined): boolean =>
  github !== undefined &&
  (github.config !== undefined ||
    github.plants !== undefined ||
    github.guilds !== undefined);

export const hasPlanMigrationPending = (pending: PlanMigrationPending | null): boolean =>
  pending !== null &&
  (pending.localFromVersion !== undefined || githubShardPending(pending.github));

export const isPlanMigrationPending = computed(() =>
  hasPlanMigrationPending(planMigrationPending.value),
);

const mergePending = (patch: PlanMigrationPending): void => {
  const prev = planMigrationPending.value ?? {};
  planMigrationPending.value = {
    localFromVersion: patch.localFromVersion ?? prev.localFromVersion,
    github: patch.github ?? prev.github,
  };
  if (!hasPlanMigrationPending(planMigrationPending.value)) {
    planMigrationPending.value = null;
  }
};

export const clearPlanMigrationPending = (): void => {
  planMigrationPending.value = null;
  planMigrationError.value = undefined;
};

export const noteLocalPlanMigrationIfNeeded = (raw: unknown): void => {
  const prev = planMigrationPending.value;
  if (!documentNeedsMigration(raw)) {
    if (prev?.localFromVersion === undefined) {
      return;
    }
    const next: PlanMigrationPending = { github: prev.github };
    planMigrationPending.value = hasPlanMigrationPending(next) ? next : null;
    return;
  }
  mergePending({ localFromVersion: readDocumentVersion(raw) });
};

export const checkGithubPlanMigration = async (
  fileName: string | undefined,
): Promise<void> => {
  if (!readGithubClientIdConfig()) {
    return;
  }
  const token = getGithubAccessToken();
  if (!token || !fileName) {
    return;
  }
  try {
    const github = await scanGithubPlanShardsForMigration(token, fileName);
    if (!githubShardPending(github)) {
      const prev = planMigrationPending.value;
      if (prev?.github === undefined) {
        return;
      }
      const next: PlanMigrationPending = { localFromVersion: prev.localFromVersion };
      planMigrationPending.value = hasPlanMigrationPending(next) ? next : null;
      return;
    }
    mergePending({ github });
  } catch (e) {
    console.error('[permaplanner] Could not check GitHub plan format version:', e);
  }
};

export const performPlanMigration = async (): Promise<void> => {
  const pending = planMigrationPending.value;
  if (!hasPlanMigrationPending(pending)) {
    return;
  }

  const store = usePermaplannerStore();
  planMigrationInFlight.value = true;
  planMigrationError.value = undefined;

  try {
    await runPlanSaveSerial(async () => {
      if (pending!.localFromVersion !== undefined) {
        const handle = store.fileHandle;
        if (!handle) {
          throw new Error(
            'Open or restore your plan file before migrating the local copy.',
          );
        }
        await store.save(handle);
      }

      if (githubShardPending(pending!.github)) {
        const token = getGithubAccessToken();
        if (!token) {
          throw new Error('Connect to GitHub before migrating the synced copy.');
        }
        const planFileName = store.fileName;
        if (!planFileName) {
          throw new Error('Save your plan to a file before migrating the GitHub copy.');
        }
        await pushPlanJsonToGithubRepo(token, store.snapshot(), planFileName);
      }
    });

    clearPlanMigrationPending();
    window.dispatchEvent(new Event(planRepoSyncUpdatedEventName));
  } catch (e) {
    planMigrationError.value = e instanceof Error ? e.message : String(e);
    throw e;
  } finally {
    planMigrationInFlight.value = false;
  }
};
