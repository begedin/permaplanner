<script setup lang="ts">
import { computed } from 'vue';

import GithubRepoSyncPanel from './GithubRepoSyncPanel.vue';
import PlanUnsavedIndicator from './PlanUnsavedIndicator.vue';
import GuildCard from './GuildCard.vue';
import { isGithubStorageLinked } from './githubRepoSync';
import { useGardenStore } from './useGardenStore';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSession } from './usePlanSession';

const permaplannerStore = usePermaplannerStore();
const garden = useGardenStore();

const { load, newPlan, save, saveAs } = usePlanSession();

const showLocalFileActions = computed(() => Boolean(permaplannerStore.fileName));
const showGithubOnlyHint = computed(
  () => !permaplannerStore.fileName && isGithubStorageLinked(),
);
</script>

<template>
  <div class="flex flex-row items-stretch h-full min-h-0">
    <div class="p-2 flex w-[220px] shrink-0 flex-col items-stretch gap-1 bg-gray-50 overflow-y-auto">
      <PlanUnsavedIndicator />
      <p
        v-if="showGithubOnlyHint"
        class="text-xs text-slate-600 p-1"
      >
        Plan backed up on GitHub. Use <strong>Open plan</strong> to also save a copy on this device.
      </p>
      <template v-if="showLocalFileActions">
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
        type="button"
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="load"
      >
        Open plan
      </button>
      <button
        type="button"
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="newPlan"
      >
        New plan
      </button>
      <GithubRepoSyncPanel />
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto bg-emerald-50/40 p-4">
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
    </div>
  </div>
</template>
