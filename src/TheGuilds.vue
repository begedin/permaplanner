<script setup lang="ts">
import GithubRepoSyncPanel from './GithubRepoSyncPanel.vue';
import GuildCard from './GuildCard.vue';
import { useGardenStore } from './useGardenStore';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSession } from './usePlanSession';

const permaplannerStore = usePermaplannerStore();
const garden = useGardenStore();

const {
  isRestoringSession,
  awaitingReopenFileClick,
  expectedRelinkName,
  continueReopenPersistedFile,
  load,
  newPlan,
  save,
  saveAs,
} = usePlanSession();
</script>

<template>
  <div class="flex flex-row items-stretch h-full min-h-0">
    <div class="p-2 flex w-[220px] shrink-0 flex-col items-stretch gap-1 bg-gray-50 overflow-y-auto">
      <p
        v-if="isRestoringSession && !permaplannerStore.fileName"
        class="p-1 text-sm text-slate-500"
        role="status"
        aria-live="polite"
      >
        Looking for a saved plan…
      </p>
      <div
        v-if="awaitingReopenFileClick && !permaplannerStore.fileName"
        class="p-2 mb-1 rounded text-sm bg-sky-100 text-sky-950 border border-sky-200"
      >
        <p class="font-medium">
          Continue with your saved file
        </p>
        <p
          v-if="expectedRelinkName"
          class="mt-1"
        >
          <code class="text-xs bg-sky-50 px-1 rounded">{{ expectedRelinkName }}</code>
        </p>
        <p class="mt-1.5 text-sky-900/90">
          The browser needs a click to allow read access after a reload.
        </p>
        <button
          type="button"
          class="mt-2 w-full bg-sky-200 hover:bg-sky-300 rounded p-1"
          @click="continueReopenPersistedFile"
        >
          Allow access and open
        </button>
      </div>
      <div
        v-if="permaplannerStore.needsFileRelink && !permaplannerStore.fileName"
        class="p-2 mb-1 rounded text-sm bg-amber-100 text-amber-950 border border-amber-200"
      >
        <p class="font-medium">
          Could not open the saved file
        </p>
        <p
          v-if="expectedRelinkName"
          class="mt-1"
        >
          It was
          <code class="text-xs bg-amber-50 px-1 rounded">{{ expectedRelinkName }}</code>
        </p>
        <p
          v-else
          class="mt-1"
        >
          The file link is no longer available.
        </p>
        <p class="mt-1.5 text-amber-900/90">
          Choose that file again, or a different <code class="text-xs">.json</code> if you
          renamed it.
        </p>
        <button
          type="button"
          class="mt-2 w-full bg-amber-200 hover:bg-amber-300 rounded p-1 text-left"
          @click="load"
        >
          Choose file…
        </button>
      </div>
      <template v-if="permaplannerStore.fileName">
        <span class="text-xs text-slate-600 truncate">{{ permaplannerStore.fileName }}</span>
        <button
          type="button"
          class="bg-green-200 hover:bg-green-300 rounded p-1"
          @click="save"
        >
          Save plan
        </button>
        <button
          type="button"
          class="bg-green-200 hover:bg-green-300 rounded p-1"
          @click="saveAs"
        >
          Save as…
        </button>
      </template>
      <button
        v-if="!isRestoringSession"
        type="button"
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="load"
      >
        Open plan
      </button>
      <button
        v-if="!isRestoringSession"
        type="button"
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="newPlan"
      >
        New plan
      </button>
      <GithubRepoSyncPanel v-if="!isRestoringSession" />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto bg-emerald-50/40 p-4">
      <div
        v-if="!permaplannerStore.fileName"
        class="max-w-lg mx-auto mt-8 text-center text-slate-600"
        :aria-busy="isRestoringSession"
      >
        <template v-if="isRestoringSession">
          <p
            class="text-slate-500 animate-pulse"
            role="status"
            aria-live="polite"
          >
            Loading your plan…
          </p>
        </template>
        <template v-else>
          <p>
            Open a <code class="text-sm bg-slate-100 px-1 rounded">.json</code> file or start
            a new plan to manage guilds. Use the <strong>Aerial</strong> tab to place guilds on
            a map when you are ready.
          </p>
        </template>
      </div>

      <template v-else>
        <div class="flex flex-row flex-wrap items-center justify-between gap-2 mb-4">
          <h1 class="text-lg font-medium text-slate-800">
            Guilds
          </h1>
          <button
            type="button"
            class="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 text-sm"
            @click="garden.createGuild"
          >
            Add guild
          </button>
        </div>
        <div
          v-if="garden.guilds.length === 0"
          class="text-slate-600 text-sm"
        >
          No guilds yet. Click <strong>Add guild</strong> to create one.
        </div>
        <div
          v-else
          class="grid gap-3 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]"
        >
          <GuildCard
            v-for="g in garden.guilds"
            :key="g.id"
            :guild-id="g.id"
            context="guilds"
          />
        </div>
      </template>
    </div>
  </div>
</template>
