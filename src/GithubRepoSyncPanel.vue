<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import GithubPlanSyncRepoNote from './GithubPlanSyncRepoNote.vue';
import {
  beginGithubAuth,
  clearGithubRepoSession,
  completeGithubAuthIfNeeded,
  fetchRemotePlanLastUpdatedMs,
  getGithubAccessToken,
  getPlanRepoGardenFolderUrl,
  githubRepoLastSyncError,
  githubRepoPushInFlightCount,
  GithubSyncError,
  planRepoSyncUpdatedEventName,
  pullPlanJsonFromGithubRepo,
  pushPlanJsonToGithubRepo,
  readGithubClientIdConfig,
} from './githubRepoSync';
import { checkGithubPlanMigration } from './usePlanMigration';
import { usePermaplannerStore } from './usePermaplannerStore';

const clientId = computed(() => readGithubClientIdConfig());

const repoPushBusy = computed(() => githubRepoPushInFlightCount.value > 0);

const permaplannerStore = usePermaplannerStore();
const { localFileLastModifiedMs } = storeToRefs(permaplannerStore);

const authMessage = ref<string | undefined>();
const syncError = ref<string | undefined>();

const githubSyncFailureMessage = (e: unknown): string =>
  e instanceof GithubSyncError ? e.message : e instanceof Error ? e.message : String(e);

const displayedSyncError = computed(
  () => syncError.value ?? githubRepoLastSyncError.value,
);
const syncing = ref(false);
const pulling = ref(false);
const connected = ref(Boolean(getGithubAccessToken()));
const remoteLastUpdatedMs = ref<number | undefined>(undefined);
const remoteLoading = ref(false);

const repoFolderUrl = ref<string | undefined>(
  getPlanRepoGardenFolderUrl(permaplannerStore.fileName),
);

const formatPlanUpdatedAt = (ms: number | undefined): string => {
  if (ms === undefined) {
    return '—';
  }
  return new Date(ms).toLocaleString();
};

const localUpdatedLabel = computed(() =>
  formatPlanUpdatedAt(localFileLastModifiedMs.value),
);

const remoteUpdatedLabel = computed(() => {
  if (remoteLoading.value) {
    return '…';
  }
  return formatPlanUpdatedAt(remoteLastUpdatedMs.value);
});

const updateRepoLink = () => {
  repoFolderUrl.value = getPlanRepoGardenFolderUrl(permaplannerStore.fileName);
};

watch(() => permaplannerStore.fileName, updateRepoLink);

const finishOAuthFromUrl = async () => {
  const r = await completeGithubAuthIfNeeded();
  if (r === 'connected') {
    authMessage.value = 'Connected to GitHub.';
  } else if (r === 'error') {
    authMessage.value = 'GitHub sign-in did not complete. Try again.';
  }
  connected.value = Boolean(getGithubAccessToken());
};

const refreshRemoteUpdatedAt = async () => {
  const token = getGithubAccessToken();
  if (!token) {
    remoteLastUpdatedMs.value = undefined;
    return;
  }
  remoteLoading.value = true;
  syncError.value = undefined;
  try {
    remoteLastUpdatedMs.value = await fetchRemotePlanLastUpdatedMs(
      token,
      permaplannerStore.fileName,
    );
  } catch (e) {
    syncError.value = githubSyncFailureMessage(e);
    remoteLastUpdatedMs.value = undefined;
  } finally {
    remoteLoading.value = false;
  }
};

const onRepoUpdated = () => {
  updateRepoLink();
  void refreshRemoteUpdatedAt();
};

onMounted(() => {
  void finishOAuthFromUrl().finally(() => {
    updateRepoLink();
    void permaplannerStore.refreshLocalFileLastModified();
    void refreshRemoteUpdatedAt();
  });
  window.addEventListener(planRepoSyncUpdatedEventName, onRepoUpdated);
});

onBeforeUnmount(() => {
  window.removeEventListener(planRepoSyncUpdatedEventName, onRepoUpdated);
});

watch([connected, () => permaplannerStore.fileName], () => {
  void permaplannerStore.refreshLocalFileLastModified();
  if (connected.value) {
    void refreshRemoteUpdatedAt();
  } else {
    remoteLastUpdatedMs.value = undefined;
  }
});

const connect = () => {
  authMessage.value = undefined;
  void beginGithubAuth();
};

const disconnect = () => {
  clearGithubRepoSession();
  connected.value = false;
  authMessage.value = undefined;
  syncError.value = undefined;
  githubRepoLastSyncError.value = undefined;
  remoteLastUpdatedMs.value = undefined;
};

const pushCurrent = async () => {
  const token = getGithubAccessToken();
  if (!token) {
    return;
  }
  syncError.value = undefined;
  syncing.value = true;
  try {
    await pushPlanJsonToGithubRepo(
      token,
      permaplannerStore.snapshot(),
      permaplannerStore.fileName,
    );
    updateRepoLink();
    await refreshRemoteUpdatedAt();
    window.dispatchEvent(new Event(planRepoSyncUpdatedEventName));
  } catch (e) {
    syncError.value = githubSyncFailureMessage(e);
  } finally {
    syncing.value = false;
  }
};

const pullRemote = async () => {
  const token = getGithubAccessToken();
  if (!token) {
    return;
  }
  syncError.value = undefined;
  pulling.value = true;
  try {
    const doc = await pullPlanJsonFromGithubRepo(token, permaplannerStore.fileName);
    permaplannerStore.applyRemoteRepoSnapshot(doc);
    updateRepoLink();
    await refreshRemoteUpdatedAt();
    await checkGithubPlanMigration(permaplannerStore.fileName);
  } catch (e) {
    syncError.value = githubSyncFailureMessage(e);
  } finally {
    pulling.value = false;
  }
};
</script>

<template>
  <div class="mt-2 p-2 paper-card text-xs text-ink-700 space-y-2">
    <p class="font-medium text-ink-800">GitHub backup</p>
    <p
      v-if="!clientId"
      class="text-amber-800"
    >
      Set <code class="bg-amber-50 px-0.5 rounded">VITE_GITHUB_CLIENT_ID</code> to enable
      sign-in.
    </p>
    <template v-else>
      <div class="flex flex-col gap-1">
        <GithubPlanSyncRepoNote
          v-if="!connected"
          size="xs"
        />
        <button
          v-if="!connected"
          type="button"
          class="btn-soft-ink btn-soft-sm w-full p-1.5 text-left"
          @click="connect"
        >
          Connect GitHub
        </button>
        <template v-else>
          <div
            class="flex flex-wrap gap-x-3 gap-y-1 text-ink-600"
            :aria-busy="repoPushBusy || syncing || pulling || remoteLoading"
          >
            <span>Local file:
              <strong class="text-ink-800">{{ localUpdatedLabel }}</strong></span>
            <span>
              Remote:
              <strong class="text-ink-800">{{ remoteUpdatedLabel }}</strong>
            </span>
            <button
              type="button"
              class="link-soft text-ink-500 hover:text-ink-800 underline"
              :disabled="remoteLoading || syncing || pulling || repoPushBusy"
              @click="refreshRemoteUpdatedAt"
            >
              Refresh remote
            </button>
          </div>
          <p
            v-if="repoPushBusy && !syncing"
            class="text-ink-500"
            role="status"
          >
            Saving backup to GitHub…
          </p>
          <div class="flex flex-col gap-1">
            <button
              type="button"
              class="btn-soft-muted btn-soft-sm w-full p-1.5 text-left disabled:opacity-50"
              :disabled="syncing || pulling || repoPushBusy"
              @click="pushCurrent"
            >
              {{ syncing ? 'Pushing…' : 'Push current' }}
            </button>
            <button
              type="button"
              class="btn-soft-muted btn-soft-sm w-full p-1.5 text-left disabled:opacity-50"
              :disabled="syncing || pulling || repoPushBusy"
              @click="pullRemote"
            >
              {{ pulling ? 'Pulling…' : 'Pull remote' }}
            </button>
            <button
              type="button"
              class="btn-soft-secondary btn-soft-sm w-full p-1.5 text-left disabled:opacity-50"
              :disabled="syncing || pulling || repoPushBusy || remoteLoading"
              @click="disconnect"
            >
              Disconnect
            </button>
          </div>
        </template>
      </div>
      <p
        v-if="repoFolderUrl"
        class="pt-0.5"
      >
        <a
          class="text-sage-800 hover:text-sage-800 underline"
          :href="repoFolderUrl"
          target="_blank"
          rel="noopener noreferrer"
        >Open plan folder on GitHub</a>
      </p>
      <p
        v-if="authMessage"
        class="text-ink-600"
      >
        {{ authMessage }}
      </p>
      <p
        v-if="displayedSyncError"
        class="text-red-700"
        role="alert"
      >
        {{ displayedSyncError }}
      </p>
    </template>
  </div>
</template>
