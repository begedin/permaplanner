<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';

  import GithubPlanSyncRepoNote from './GithubPlanSyncRepoNote.vue';
  import {
    beginGithubAuth,
    clearGithubRepoSession,
    completeGithubAuthIfNeeded,
    getGithubAccessToken,
    isGithubStorageLinked,
    listGithubPlansInRepo,
    pullPlanJsonFromGithubRepo,
    readGithubClientIdConfig,
    type GithubPlanListEntry,
  } from './legacyImport/github';
  import { pickAndImportLocalFile } from './legacyImport/localFile';
  import { importGardenDocument } from './legacyImport/localFile';
  import { migrateForImport } from './legacyImport/migrateForImport';
  import { routeNames } from './router';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { useGardenSession } from './useGardenSession';
  import {
    getFileHandle,
    ensureReadAccess,
    clearFileBinding,
  } from './sessionFileHandle';

  const router = useRouter();
  const gardenSession = useGardenSessionStore();
  const { createEmptyGarden, activateGarden } = useGardenSession();

  const githubClientConfigured = computed(() => Boolean(readGithubClientIdConfig()));
  const githubConnected = ref(isGithubStorageLinked());
  const githubPlans = ref<GithubPlanListEntry[]>([]);
  const githubLoading = ref(false);
  const githubError = ref<string | undefined>();
  const actionError = ref<string | undefined>();
  const idbOfferName = ref<string | undefined>();

  onMounted(async () => {
    const oauth = await completeGithubAuthIfNeeded();
    if (oauth === 'connected') {
      githubConnected.value = true;
      void loadGithubPlans();
    }
    await tryOfferIdbImport();
  });

  const tryOfferIdbImport = async () => {
    const handle = await getFileHandle();
    if (!handle) {
      return;
    }
    try {
      if (!(await ensureReadAccess(handle))) {
        return;
      }
      const file = await handle.getFile();
      idbOfferName.value = file.name;
    } catch {
      /* ignore */
    }
  };

  const importFromIdb = async () => {
    actionError.value = undefined;
    try {
      const handle = await getFileHandle();
      if (!handle) {
        return;
      }
      const file = await handle.getFile();
      const document = await migrateForImport(JSON.parse(await file.text()));
      const garden = await importGardenDocument(document, {
        name: file.name.replace(/\.json$/i, ''),
        importSource: 'local',
      });
      await clearFileBinding();
      idbOfferName.value = undefined;
      await gardenSession.refreshList();
      gardenSession.setActiveGardenId(garden.id);
      await activateGarden(garden.id);
      await router.replace({ name: routeNames.guilds });
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : String(e);
    }
  };

  const importLocalFile = async () => {
    actionError.value = undefined;
    try {
      const garden = await pickAndImportLocalFile();
      await gardenSession.refreshList();
      gardenSession.setActiveGardenId(garden.id);
      await activateGarden(garden.id);
      await router.replace({ name: routeNames.guilds });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        return;
      }
      actionError.value = e instanceof Error ? e.message : String(e);
    }
  };

  const connectGithub = () => {
    void beginGithubAuth();
  };

  const loadGithubPlans = async () => {
    const token = getGithubAccessToken();
    if (!token) {
      return;
    }
    githubLoading.value = true;
    githubError.value = undefined;
    try {
      githubPlans.value = await listGithubPlansInRepo(token);
    } catch (e) {
      githubError.value = e instanceof Error ? e.message : String(e);
    } finally {
      githubLoading.value = false;
    }
  };

  const importFromGithub = async (entry: GithubPlanListEntry) => {
    const token = getGithubAccessToken();
    if (!token) {
      return;
    }
    actionError.value = undefined;
    try {
      const raw = await pullPlanJsonFromGithubRepo(token, entry.suggestedFileName);
      const document = await migrateForImport(raw);
      const garden = await importGardenDocument(document, {
        name: entry.gardenFolderSegment,
        importSource: 'github',
      });
      await gardenSession.refreshList();
      gardenSession.setActiveGardenId(garden.id);
      await activateGarden(garden.id);
      await router.replace({ name: routeNames.guilds });
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : String(e);
    }
  };

  const startEmpty = async () => {
    actionError.value = undefined;
    try {
      await createEmptyGarden('My garden');
      await router.replace({ name: routeNames.guilds });
    } catch (e) {
      actionError.value = e instanceof Error ? e.message : String(e);
    }
  };

  const disconnectGithub = () => {
    clearGithubRepoSession();
    githubConnected.value = false;
    githubPlans.value = [];
  };
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-6 bg-parchment-100">
    <div class="w-full max-w-lg rounded-2xl border border-parchment-300/55 paper-surface shadow-parchment-lg p-8">
      <header class="text-center mb-6">
        <h1 class="text-xl font-semibold text-ink-800">Set up your garden</h1>
        <p class="mt-2 text-ink-600">
          Import an existing plan or start with an empty garden.
        </p>
      </header>

      <div
        v-if="idbOfferName"
        class="mb-5 p-4 rounded-xl bg-blossom-50/90 border border-lavender-200/70 text-sm"
      >
        <p class="font-medium">Restore your last local plan?</p>
        <p class="mt-1">
          <code class="text-xs bg-parchment-50 px-1 rounded">{{ idbOfferName }}</code>
        </p>
        <button
          type="button"
          class="mt-3 w-full btn-soft-lavender px-4 py-2.5 font-medium"
          @click="importFromIdb"
        >
          Import this file
        </button>
      </div>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-ink-700">From your device</h2>
        <button
          type="button"
          class="w-full btn-soft-primary px-4 py-3 font-medium text-left"
          @click="importLocalFile"
        >
          Import JSON file…
        </button>
        <button
          type="button"
          class="w-full btn-soft-secondary px-4 py-3 font-medium text-left"
          @click="startEmpty"
        >
          Create empty garden
        </button>
      </section>

      <div
        class="my-6 flex items-center gap-3 text-xs text-ink-400 uppercase tracking-wide"
        aria-hidden="true"
      >
        <span class="flex-1 border-t border-parchment-300" />
        <span>or</span>
        <span class="flex-1 border-t border-parchment-300" />
      </div>

      <section class="space-y-3">
        <h2 class="text-sm font-medium text-ink-700">From GitHub backup</h2>
        <GithubPlanSyncRepoNote v-if="githubClientConfigured && !githubConnected" />
        <button
          v-if="githubClientConfigured && !githubConnected"
          type="button"
          class="w-full btn-soft-ink px-4 py-3 font-medium text-left"
          @click="connectGithub"
        >
          Connect GitHub
        </button>
        <template v-if="githubConnected">
          <button
            type="button"
            class="w-full btn-soft-muted px-4 py-2 text-left"
            :disabled="githubLoading"
            @click="loadGithubPlans"
          >
            {{ githubLoading ? 'Loading…' : 'Refresh garden list' }}
          </button>
          <ul
            v-if="githubPlans.length"
            class="space-y-2"
          >
            <li
              v-for="entry in githubPlans"
              :key="entry.gardenFolderSegment"
            >
              <button
                type="button"
                class="w-full btn-soft-secondary px-3 py-2 text-left text-sm"
                @click="importFromGithub(entry)"
              >
                {{ entry.gardenFolderSegment }}
              </button>
            </li>
          </ul>
          <p
            v-else-if="!githubLoading"
            class="text-sm text-ink-600"
          >
            No gardens found in your backup repo.
          </p>
          <button
            type="button"
            class="text-sm underline text-ink-500"
            @click="disconnectGithub"
          >
            Disconnect GitHub
          </button>
        </template>
      </section>

      <p
        v-if="actionError || githubError"
        class="mt-4 text-sm text-red-700"
        role="alert"
      >
        {{ actionError || githubError }}
      </p>
    </div>
  </div>
</template>
