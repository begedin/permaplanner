<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import {
  beginGithubAuth,
  clearGithubRepoSession,
  completeGithubAuthIfNeeded,
  getGithubAccessToken,
  getPlanRepoBlobUrl,
  planRepoSyncUpdatedEventName,
  pushPlanJsonToGithubRepo,
  readGithubClientIdConfig,
} from './githubRepoSync';
import { usePermaplannerStore } from './usePermaplannerStore';

const clientId = computed(() => readGithubClientIdConfig());

const permaplannerStore = usePermaplannerStore();

const authMessage = ref<string | undefined>();
const syncError = ref<string | undefined>();
const syncing = ref(false);
const connected = ref(Boolean(getGithubAccessToken()));

const repoFileUrl = ref<string | undefined>(getPlanRepoBlobUrl(permaplannerStore.fileName));

const updateRepoLink = () => {
  repoFileUrl.value = getPlanRepoBlobUrl(permaplannerStore.fileName);
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

const onRepoUpdated = () => {
  updateRepoLink();
};

onMounted(() => {
  void finishOAuthFromUrl().finally(() => {
    updateRepoLink();
  });
  window.addEventListener(planRepoSyncUpdatedEventName, onRepoUpdated);
});

onBeforeUnmount(() => {
  window.removeEventListener(planRepoSyncUpdatedEventName, onRepoUpdated);
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
};

const syncNow = async () => {
  const token = getGithubAccessToken();
  if (!token) {
    return;
  }
  syncError.value = undefined;
  syncing.value = true;
  try {
    await pushPlanJsonToGithubRepo(token, permaplannerStore.snapshot(), permaplannerStore.fileName);
    updateRepoLink();
  } catch (e) {
    syncError.value = e instanceof Error ? e.message : String(e);
  } finally {
    syncing.value = false;
  }
};

const copyLink = async () => {
  const url = repoFileUrl.value;
  if (!url) {
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    authMessage.value = 'Link copied to clipboard.';
  } catch {
    authMessage.value = 'Could not copy automatically; select the link and copy it.';
  }
};
</script>

<template>
  <div class="mt-2 p-2 rounded border border-slate-200 bg-white text-xs text-slate-700 space-y-2">
    <p class="font-medium text-slate-800">GitHub repo backup</p>
    <p
      v-if="!clientId"
      class="text-amber-800"
    >
      Set <code class="bg-amber-50 px-0.5 rounded">VITE_GITHUB_CLIENT_ID</code> to enable sign-in.
      Use a GitHub OAuth app whose callback URL is this app’s
      <code class="bg-amber-50 px-0.5 rounded">/garden</code> URL, and add the
      <code class="bg-amber-50 px-0.5 rounded">repo</code> scope so Permaplanner can create a private
      repo and sync JSON.
    </p>
    <template v-else>
      <p class="text-slate-600 leading-snug">
        After you connect, each local save pushes your plan to a private repo named
        <code class="bg-slate-100 px-0.5 rounded">permaplanner-plan-sync</code>. Each garden gets a
        folder <code class="bg-slate-100 px-0.5 rounded">plans/&lt;name&gt;/</code> with
        <code class="bg-slate-100 px-0.5 rounded">plants.json</code>,
        <code class="bg-slate-100 px-0.5 rounded">guilds.json</code>,
        <code class="bg-slate-100 px-0.5 rounded">config.json</code>, and
        <code class="bg-slate-100 px-0.5 rounded">background.&lt;ext&gt;</code> when you have a
        photo (normal git blobs via GitHub’s API — not Git LFS). The link below opens
        <code class="bg-slate-100 px-0.5 rounded">config.json</code> on GitHub.
      </p>
      <div class="flex flex-col gap-1">
        <button
          v-if="!connected"
          type="button"
          class="bg-slate-800 hover:bg-slate-900 text-white rounded p-1.5 text-left"
          @click="connect"
        >
          Connect GitHub
        </button>
        <template v-else>
          <button
            type="button"
            class="bg-slate-200 hover:bg-slate-300 rounded p-1.5 text-left disabled:opacity-50"
            :disabled="syncing"
            @click="syncNow"
          >
            {{ syncing ? 'Syncing…' : 'Sync now' }}
          </button>
          <button
            type="button"
            class="bg-slate-100 hover:bg-slate-200 rounded p-1.5 text-left"
            @click="disconnect"
          >
            Disconnect
          </button>
        </template>
      </div>
      <div
        v-if="repoFileUrl"
        class="space-y-1"
      >
        <label class="block text-slate-500">config.json on GitHub</label>
        <div class="flex gap-1">
          <input
            class="flex-1 min-w-0 text-[11px] border border-slate-300 rounded px-1 py-0.5 font-mono"
            readonly
            :value="repoFileUrl"
            aria-label="GitHub file URL"
          />
          <button
            type="button"
            class="shrink-0 bg-emerald-200 hover:bg-emerald-300 rounded px-2"
            @click="copyLink"
          >
            Copy
          </button>
        </div>
        <p class="text-slate-500 leading-snug">
          The repo is private; this link works for people who can read the repo on GitHub.
        </p>
      </div>
      <p
        v-if="authMessage"
        class="text-slate-600"
      >
        {{ authMessage }}
      </p>
      <p
        v-if="syncError"
        class="text-red-700"
      >
        {{ syncError }}
      </p>
    </template>
  </div>
</template>
