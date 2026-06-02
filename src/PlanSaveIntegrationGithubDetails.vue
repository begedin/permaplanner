<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';

  import GithubPlanSyncRepoNote from './GithubPlanSyncRepoNote.vue';
  import {
    beginGithubAuth,
    clearGithubRepoSession,
    completeGithubAuthIfNeeded,
    getGithubAccessToken,
    githubRepoPushInFlightCount,
    loadGithubRemoteSaveBaseline,
    pullPlanJsonFromGithubRepo,
  } from './githubRepoSync';
  import { githubSaveFailureMessage } from './planSaveIntegrations/github';
  import { checkGithubPlanMigration } from './usePlanMigration';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';

  const permaplannerStore = usePermaplannerStore();
  const planSaveCoordinator = usePlanSaveCoordinator();

  const authMessage = ref<string | undefined>();
  const actionError = ref<string | undefined>();
  const syncing = ref(false);
  const pulling = ref(false);
  const connected = ref(Boolean(getGithubAccessToken()));

  const repoPushBusy = computed(() => githubRepoPushInFlightCount.value > 0);
  const busy = computed(() => repoPushBusy.value || syncing.value || pulling.value);

  const finishOAuthFromUrl = async () => {
    const r = await completeGithubAuthIfNeeded();
    if (r === 'connected') {
      authMessage.value = 'Connected to GitHub.';
    } else if (r === 'error') {
      authMessage.value = 'GitHub sign-in did not complete. Try again.';
    }
    connected.value = Boolean(getGithubAccessToken());
    if (r === 'connected') {
      planSaveCoordinator.markIntegrationsSaved(['github']);
      const token = getGithubAccessToken();
      if (token && permaplannerStore.fileName) {
        try {
          await loadGithubRemoteSaveBaseline(token, permaplannerStore.fileName);
        } catch {
          /* baseline fetch is best-effort on connect */
        }
      }
    }
    void planSaveCoordinator.refreshDetails('github');
  };

  onMounted(() => {
    void finishOAuthFromUrl();
  });

  watch(
    () => permaplannerStore.fileName,
    () => {
      void planSaveCoordinator.refreshDetails('github');
    },
  );

  const connect = () => {
    authMessage.value = undefined;
    void beginGithubAuth();
  };

  const disconnect = () => {
    clearGithubRepoSession();
    connected.value = false;
    authMessage.value = undefined;
    actionError.value = undefined;
  };

  const pushCurrent = async () => {
    const token = getGithubAccessToken();
    if (!token) {
      return;
    }
    actionError.value = undefined;
    syncing.value = true;
    try {
      await planSaveCoordinator.saveIntegration('github');
    } catch (e) {
      actionError.value = githubSaveFailureMessage(e);
    } finally {
      syncing.value = false;
    }
  };

  const pullRemote = async () => {
    const token = getGithubAccessToken();
    if (!token) {
      return;
    }
    actionError.value = undefined;
    pulling.value = true;
    try {
      const doc = await pullPlanJsonFromGithubRepo(token, permaplannerStore.fileName);
      permaplannerStore.applyRemoteRepoSnapshot(doc);
      planSaveCoordinator.markIntegrationsSaved(['github']);
      await loadGithubRemoteSaveBaseline(token, permaplannerStore.fileName);
      await checkGithubPlanMigration(permaplannerStore.fileName);
    } catch (e) {
      actionError.value = githubSaveFailureMessage(e);
    } finally {
      pulling.value = false;
    }
  };

  const refreshRemote = () => {
    void planSaveCoordinator.refreshDetails('github');
  };
</script>

<template>
  <div class="space-y-2 pt-1">
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
      <div class="flex flex-col gap-1">
        <button
          type="button"
          class="btn-soft-muted btn-soft-sm w-full p-1.5 text-left disabled:opacity-50"
          :disabled="busy"
          @click="pushCurrent"
        >
          {{ syncing || repoPushBusy ? 'Pushing…' : 'Push now' }}
        </button>
        <button
          type="button"
          class="btn-soft-muted btn-soft-sm w-full p-1.5 text-left disabled:opacity-50"
          :disabled="busy"
          @click="pullRemote"
        >
          {{ pulling ? 'Pulling…' : 'Pull remote' }}
        </button>
        <button
          type="button"
          class="link-soft text-ink-500 hover:text-ink-800 underline text-left disabled:opacity-50"
          :disabled="busy"
          @click="refreshRemote"
        >
          Refresh remote timestamp
        </button>
        <button
          type="button"
          class="btn-soft-secondary btn-soft-sm w-full p-1.5 text-left disabled:opacity-50"
          :disabled="busy"
          @click="disconnect"
        >
          Disconnect
        </button>
      </div>
    </template>
    <p
      v-if="authMessage"
      class="text-ink-600"
    >
      {{ authMessage }}
    </p>
    <p
      v-if="actionError"
      class="text-red-700"
      role="alert"
    >
      {{ actionError }}
    </p>
  </div>
</template>
