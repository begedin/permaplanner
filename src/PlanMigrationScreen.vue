<script setup lang="ts">
import { computed } from 'vue';

import {
  buildGithubPlanShardExports,
  buildLocalPlanJsonText,
  downloadTextAsFile,
} from './permaplannerFileExport';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import { getGithubAccessToken, planGardenFolderSegment } from './githubRepoSync';
import { usePermaplannerStore } from './usePermaplannerStore';
import {
  performPlanMigration,
  planMigrationError,
  planMigrationInFlight,
  planMigrationPending,
} from './usePlanMigration';

const permaplannerStore = usePermaplannerStore();

const pending = computed(() => planMigrationPending.value);

const localPending = computed(() => pending.value?.localFromVersion !== undefined);
const githubPending = computed(() => {
  const g = pending.value?.github;
  return (
    g !== undefined &&
    (g.config !== undefined || g.plants !== undefined || g.guilds !== undefined)
  );
});

const canMigrateLocal = computed(
  () => !localPending.value || permaplannerStore.fileHandle !== undefined,
);
const canMigrateGithub = computed(
  () =>
    !githubPending.value ||
    (Boolean(permaplannerStore.fileName) && Boolean(getGithubAccessToken())),
);

const canMigrate = computed(() => canMigrateLocal.value && canMigrateGithub.value);

const migrateHint = computed(() => {
  if (localPending.value && !permaplannerStore.fileHandle) {
    return 'Restore file access (or open your plan) before migrating the local copy.';
  }
  if (githubPending.value && !permaplannerStore.fileName) {
    return 'Save your plan to a file before migrating the GitHub copy.';
  }
  if (githubPending.value && !getGithubAccessToken()) {
    return 'Connect to GitHub before migrating the synced copy.';
  }
  return undefined;
});

const downloadBaseName = computed(() => {
  const stem = permaplannerStore.fileName?.replace(/\.json$/i, '') ?? 'plan';
  return stem;
});

const hasLoadedPlan = computed(() => permaplannerStore.fileName !== undefined);

const downloadLocalJson = () => {
  const text = buildLocalPlanJsonText(permaplannerStore.snapshot());
  downloadTextAsFile(
    `${downloadBaseName.value}-v${PERMAPLANNER_FILE_VERSION}.json`,
    text,
  );
};

const downloadGithubShards = () => {
  const segment = planGardenFolderSegment(permaplannerStore.fileName);
  const { configJson, plantsJson, guildsJson } = buildGithubPlanShardExports(
    permaplannerStore.snapshot(),
    { gardenFolderSegment: segment },
  );
  const prefix = `${segment}-v${PERMAPLANNER_FILE_VERSION}`;
  downloadTextAsFile(`${prefix}-config.json`, configJson);
  downloadTextAsFile(`${prefix}-plants.json`, plantsJson);
  downloadTextAsFile(`${prefix}-guilds.json`, guildsJson);
};

const onMigrate = () => {
  void performPlanMigration().catch(() => {
    /* planMigrationError is set */
  });
};
</script>

<template>
  <div class="space-y-5">
    <header class="text-center">
      <h1
        id="plan-migration-heading"
        class="text-xl font-semibold text-ink-800"
      >
        Update your plan format
      </h1>
      <p class="mt-2 text-ink-600">
        Your saved data uses an older format. Download backups at version
        {{ PERMAPLANNER_FILE_VERSION }}, then migrate to continue.
      </p>
    </header>

    <ul
      v-if="localPending || githubPending"
      class="text-sm text-ink-600 list-disc list-inside bg-lavender-50/80 rounded-lg p-3 border border-lavender-200"
    >
      <li v-if="localPending">Local file (version {{ pending?.localFromVersion }})</li>
      <li v-if="githubPending">
        GitHub sync
        <span v-if="pending?.github?.config !== undefined">
          · config v{{ pending.github.config }}</span
        >
        <span v-if="pending?.github?.plants !== undefined">
          · plants v{{ pending.github.plants }}</span
        >
        <span v-if="pending?.github?.guilds !== undefined">
          · guilds v{{ pending.github.guilds }}</span
        >
      </li>
    </ul>

    <section>
      <h2 class="text-sm font-medium text-ink-800">Download current format (backup)</h2>
      <div
        v-if="hasLoadedPlan"
        class="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      >
        <button
          type="button"
          class="flex-1 min-w-[10rem] bg-parchment-50 hover:bg-lavender-50 border border-lavender-200 rounded-lg px-4 py-2.5 text-sm text-left"
          @click="downloadLocalJson"
        >
          Local plan (.json)
        </button>
        <button
          type="button"
          class="flex-1 min-w-[10rem] bg-parchment-50 hover:bg-lavender-50 border border-lavender-200 rounded-lg px-4 py-2.5 text-sm text-left"
          @click="downloadGithubShards"
        >
          GitHub shards (config, plants, guilds)
        </button>
      </div>
      <p
        v-else
        class="mt-2 text-sm text-ink-600"
      >
        Open your plan to download backups of the current format.
      </p>
    </section>

    <button
      type="button"
      class="w-full bg-lavender-600 hover:bg-lavender-700 disabled:opacity-50 text-white rounded-lg px-4 py-3 text-base font-medium"
      :disabled="planMigrationInFlight || !canMigrate"
      @click="onMigrate"
    >
      {{ planMigrationInFlight ? 'Migrating…' : 'Migrate saved copies' }}
    </button>
    <p
      v-if="migrateHint"
      class="text-sm text-center text-ink-600"
    >
      {{ migrateHint }}
    </p>
    <p
      v-if="planMigrationError"
      class="text-sm text-center text-red-800"
      role="alert"
    >
      {{ planMigrationError }}
    </p>
  </div>
</template>
