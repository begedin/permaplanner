<script setup lang="ts">
  import { computed } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import { useRoute } from 'vue-router';

  import AppFooter from './AppFooter.vue';
  import GardenCalendarToggle from './GardenCalendarToggle.vue';
  import { useGardenCalendarStore } from './useGardenCalendarStore';
  import AuthGate from './AuthGate.vue';
  import GardenSaveErrorToast from './GardenSaveErrorToast.vue';
  import PlantIconSprite from './plantIcons/PlantIconSprite.vue';
  import UiIconSprite from './uiIcons/UiIconSprite.vue';
  import PlantParts from './PlantParts.vue';
  import { showMainApp } from './useAuthGate';
  import { usePlanUndoRedoHotkeys } from './usePlanUndoRedoHotkeys';
  import { routeNames } from './router';
  import { useGuildWorkspaceStore } from './useGuildWorkspaceStore';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';

  const gardenSession = useGardenSessionStore();
  const calendar = useGardenCalendarStore();
  const workspace = useGuildWorkspaceStore();

  usePlanUndoRedoHotkeys();

  const route = useRoute();
  const isPrivacyPage = computed(() => route.name === routeNames.privacy);
  const isAuthPage = computed(
    () =>
      route.name === routeNames.login ||
      route.name === routeNames.register ||
      route.name === routeNames.import,
  );

  useEventListener(window, 'beforeunload', (event) => {
    if (gardenSession.hasUnsavedChanges) {
      event.preventDefault();
      event.returnValue = '';
    }
  });
</script>
<template>
  <PlantParts />
  <PlantIconSprite />
  <UiIconSprite />
  <AuthGate v-if="!showMainApp && !isPrivacyPage && !isAuthPage" />
  <RouterView v-if="isAuthPage || isPrivacyPage" />
  <div
    v-else-if="showMainApp && !isPrivacyPage"
    class="flex flex-col h-full min-h-0"
  >
    <div class="flex-1 min-h-0 overflow-auto w-full">
      <RouterView />
    </div>

    <div class="relative shrink-0">
      <GardenCalendarToggle
        v-if="workspace.mapVisibility !== 'visible'"
        class="absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 sm:left-auto sm:right-2 sm:translate-x-0"
      />
      <div
        id="garden-calendar"
        :inert="!calendar.open"
        :aria-hidden="!calendar.open"
      >
        <Transition
          enter-from-class="!grid-rows-[0fr] opacity-0"
          leave-to-class="!grid-rows-[0fr] opacity-0"
        >
          <div
            v-if="calendar.open"
            class="grid grid-rows-[1fr] motion-safe:transition-[grid-template-rows,opacity] motion-safe:duration-200 motion-safe:ease-in-out"
          >
            <div class="min-h-0 overflow-hidden">
              <AppFooter />
            </div>
          </div>
        </Transition>
      </div>
    </div>
    <GardenSaveErrorToast />
  </div>
</template>
