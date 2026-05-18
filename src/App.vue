<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import AppFooter from './AppFooter.vue';
import PlanAppGate from './PlanAppGate.vue';
import PlanSessionDrawer from './PlanSessionDrawer.vue';
import PlantParts from './PlantParts.vue';
import { showMainApp } from './usePlanAppGate';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSession } from './usePlanSession';

usePlanSession();

const planDrawerOpen = ref(false);
const { unsavedChanges } = storeToRefs(usePermaplannerStore());

const planMenuLabel = computed(() =>
  unsavedChanges.value ? 'Plan and sync, unsaved changes' : 'Plan and sync',
);
</script>
<template>
  <PlantParts />
  <PlanAppGate v-if="!showMainApp" />
  <div
    v-else
    class="flex flex-col h-full min-h-0"
  >
    <nav class="flex flex-row h-8 shrink-0 items-stretch z-20 bg-emerald-100 border-b border-emerald-300/60">
      <div class="relative shrink-0 flex items-stretch border-r border-emerald-300/60">
        <button
          type="button"
          class="flex items-center justify-center w-10 h-full px-2 text-slate-700 hover:bg-emerald-200 transition-colors"
          :aria-label="planMenuLabel"
          :aria-expanded="planDrawerOpen"
          @click="planDrawerOpen = !planDrawerOpen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-5 h-5"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line
              x1="12"
              y1="18"
              x2="12"
              y2="12"
            />
            <line
              x1="9"
              y1="15"
              x2="15"
              y2="15"
            />
          </svg>
        </button>
        <span
          v-if="unsavedChanges"
          class="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-emerald-100"
          aria-hidden="true"
        />
      </div>
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 flex-1 text-slate-600 text-center transition-colors flex items-center justify-center"
        active-class="bg-emerald-300"
        to="/guilds"
      >
        Guilds
      </RouterLink>
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 flex-1 text-slate-600 text-center transition-colors flex items-center justify-center"
        active-class="bg-emerald-300"
        to="/aerial"
      >
        Aerial
      </RouterLink>
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 flex-1 text-slate-600 text-center transition-colors flex items-center justify-center"
        active-class="bg-emerald-300"
        to="/plants"
      >
        Plants
      </RouterLink>
    </nav>

    <PlanSessionDrawer v-model:open="planDrawerOpen" />

    <div class="flex-1 min-h-0 overflow-auto w-full">
      <RouterView />
    </div>

    <AppFooter />
  </div>
</template>
