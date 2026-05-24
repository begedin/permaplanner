<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';

import {
  beginGithubAuth,
  clearGithubRepoSession,
  completeGithubAuthIfNeeded,
  fetchRemotePlanSyncRevision,
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
const { syncRevision } = storeToRefs(permaplannerStore);

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
const remoteSyncRevision = ref<number | undefined>(undefined);
const remoteLoading = ref(false);

const repoFolderUrl = ref<string | undefined>(
  getPlanRepoGardenFolderUrl(permaplannerStore.fileName),
);

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

const refreshRemoteRevision = async () => {
  const token = getGithubAccessToken();
  if (!token) {
    remoteSyncRevision.value = undefined;
    return;
  }
  remoteLoading.value = true;
  syncError.value = undefined;
  try {
    remoteSyncRevision.value = await fetchRemotePlanSyncRevision(
      token,
      permaplannerStore.fileName,
    );
  } catch (e) {
    syncError.value = githubSyncFailureMessage(e);
    remoteSyncRevision.value = undefined;
  } finally {
    remoteLoading.value = false;
  }
};

const onRepoUpdated = () => {
  updateRepoLink();
  void refreshRemoteRevision();
};

onMounted(() => {
  void finishOAuthFromUrl().finally(() => {
    updateRepoLink();
    void refreshRemoteRevision();
  });
  window.addEventListener(planRepoSyncUpdatedEventName, onRepoUpdated);
});

onBeforeUnmount(() => {
  window.removeEventListener(planRepoSyncUpdatedEventName, onRepoUpdated);
});

watch([connected, () => permaplannerStore.fileName], () => {
  if (connected.value) {
    void refreshRemoteRevision();
  } else {
    remoteSyncRevision.value = undefined;
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
  remoteSyncRevision.value = undefined;
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
    await refreshRemoteRevision();
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
    remoteSyncRevision.value = doc.syncRevision;
    await checkGithubPlanMigration(permaplannerStore.fileName);
  } catch (e) {
    syncError.value = githubSyncFailureMessage(e);
  } finally {
    pulling.value = false;
  }
};
</script>

<template>
  <div
    class="mt-2 p-2 rounded border border-parchment-300 paper-surface text-xs text-ink-700 space-y-2"
  >
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
        <button
          v-if="!connected"
          type="button"
          class="bg-ink-800 hover:bg-ink-900 text-white rounded p-1.5 text-left"
          @click="connect"
        >
          Connect GitHub
        </button>
        <template v-else>
          <div
            class="flex flex-wrap gap-x-3 gap-y-1 text-ink-600"
            :aria-busy="repoPushBusy || syncing || pulling || remoteLoading"
          >
            <span
              >Local sync: <strong class="text-ink-800">{{ syncRevision }}</strong></span
            >
            <span>
              Remote:
              <strong
                v-if="remoteLoading"
                class="text-ink-500"
                >…</strong
              >
              <strong
                v-else-if="remoteSyncRevision !== undefined"
                class="text-ink-800"
                >{{ remoteSyncRevision }}</strong
              >
              <strong
                v-else
                class="text-ink-500 font-normal"
                >—</strong
              >
            </span>
            <button
              type="button"
              class="text-ink-500 hover:text-ink-800 underline"
              :disabled="remoteLoading || syncing || pulling || repoPushBusy"
              @click="refreshRemoteRevision"
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
              class="bg-parchment-300 hover:bg-parchment-400 rounded p-1.5 text-left disabled:opacity-50"
              :disabled="syncing || pulling || repoPushBusy"
              @click="pushCurrent"
            >
              {{ syncing ? 'Pushing…' : 'Push current' }}
            </button>
            <button
              type="button"
              class="bg-parchment-300 hover:bg-parchment-400 rounded p-1.5 text-left disabled:opacity-50"
              :disabled="syncing || pulling || repoPushBusy"
              @click="pullRemote"
            >
              {{ pulling ? 'Pulling…' : 'Pull remote' }}
            </button>
            <button
              type="button"
              class="bg-parchment-200 hover:bg-parchment-300 rounded p-1.5 text-left disabled:opacity-50"
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
          >Open plan folder on GitHub</a
        >
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
