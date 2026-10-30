<script setup lang="ts">
  import { computed, onMounted, watch } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import { useRoute } from 'vue-router';

  import AppFooter from './AppFooter.vue';
  import AuthGate from './AuthGate.vue';
  import PlantIconSprite from './plantIcons/PlantIconSprite.vue';
  import UiIconSprite from './uiIcons/UiIconSprite.vue';
  import PlantParts from './PlantParts.vue';
  import { showMainApp } from './useAuthGate';
  import { usePlanUndoRedoHotkeys } from './usePlanUndoRedoHotkeys';
  import { routeNames } from './router';
  import { useAuthStore } from './stores/useAuthStore';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';

  const auth = useAuthStore();
  const gardenSession = useGardenSessionStore();
  onMounted(() => {
    void auth.bootstrap();
  });

  watch(
    () => auth.user?.totpConfirmed,
    (confirmed) => {
      if (confirmed && gardenSession.isBootstrapping) {
        void gardenSession.bootstrap();
      }
    },
    { immediate: true },
  );

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

    <AppFooter />
  </div>
</template>
