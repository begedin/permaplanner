<script setup lang="ts">
import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import AppFooter from './AppFooter.vue';
import PlanAppGate from './PlanAppGate.vue';
import PlanSessionDrawer from './PlanSessionDrawer.vue';
import PlantIconSprite from './plantIcons/PlantIconSprite.vue';
import UiIcon from './uiIcons/UiIcon.vue';
import UiIconSprite from './uiIcons/UiIconSprite.vue';
import PlantParts from './PlantParts.vue';
import { showMainApp } from './usePlanAppGate';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSession } from './usePlanSession';
import { useGuildSelection } from './useGuildSelection';

usePlanSession();

const { guildsTabTo, aerialTabTo } = useGuildSelection();

const planDrawerOpen = ref(false);
const { unsavedChanges } = storeToRefs(usePermaplannerStore());

const planMenuLabel = computed(() =>
  unsavedChanges.value ? 'Plan and sync, unsaved changes' : 'Plan and sync',
);
</script>
<template>
  <PlantParts />
  <PlantIconSprite />
  <UiIconSprite />
  <PlanAppGate v-if="!showMainApp" />
  <div
    v-else
    class="flex flex-col h-full min-h-0"
  >
    <nav
      class="flex flex-row h-8 shrink-0 items-stretch z-20 bg-sage-100 border-b border-sage-300/60"
    >
      <div class="relative shrink-0 flex items-stretch border-r border-sage-300/60">
        <button
          type="button"
          class="flex items-center justify-center w-10 h-full px-2 text-ink-700 hover:bg-sage-200 transition-colors"
          :aria-label="planMenuLabel"
          :aria-expanded="planDrawerOpen"
          @click="planDrawerOpen = !planDrawerOpen"
        >
          <UiIcon
            name="document"
            class="size-5"
          />
        </button>
        <span
          v-if="unsavedChanges"
          class="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-sage-100"
          aria-hidden="true"
        />
      </div>
      <RouterLink
        class="bg-sage-200 hover:bg-sage-300 px-2 py-1 flex-1 text-ink-600 text-center transition-colors flex items-center justify-center"
        active-class="bg-sage-300"
        :to="guildsTabTo"
      >
        Guilds
      </RouterLink>
      <RouterLink
        class="bg-sage-200 hover:bg-sage-300 px-2 py-1 flex-1 text-ink-600 text-center transition-colors flex items-center justify-center"
        active-class="bg-sage-300"
        :to="aerialTabTo"
      >
        Aerial
      </RouterLink>
      <RouterLink
        class="bg-sage-200 hover:bg-sage-300 px-2 py-1 flex-1 text-ink-600 text-center transition-colors flex items-center justify-center"
        active-class="bg-sage-300"
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
