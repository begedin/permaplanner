<script setup lang="ts">
  import { computed, onMounted, ref, watch } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useRoute } from 'vue-router';

  import AppFooter from './AppFooter.vue';
  import AuthGate from './AuthGate.vue';
  import PlanSessionDrawer from './PlanSessionDrawer.vue';
  import PlantIconSprite from './plantIcons/PlantIconSprite.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import UiIconSprite from './uiIcons/UiIconSprite.vue';
  import PlantParts from './PlantParts.vue';
  import { showMainApp } from './useAuthGate';
  import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
  import { bootstrapGardenSession, isGardenBootstrapping } from './useGardenSession';
  import { usePlanUndoRedoHotkeys } from './usePlanUndoRedoHotkeys';
  import { useCalendarSelection } from './useCalendarSelection';
  import { useGuildSelection } from './useGuildSelection';
  import { routeNames } from './router';
  import { useAuthStore } from './stores/useAuthStore';

  const auth = useAuthStore();
  onMounted(() => {
    void auth.bootstrap();
  });

  watch(
    () => auth.user?.totpConfirmed,
    (confirmed) => {
      if (confirmed && isGardenBootstrapping.value) {
        void bootstrapGardenSession();
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

  const { guildsTabTo, aerialTabTo } = useGuildSelection();
  const { calendarTabTo } = useCalendarSelection();

  const planDrawerOpen = ref(false);
  const { hasUnsavedChanges } = storeToRefs(usePlanSaveCoordinator());

  const planMenuLabel = computed(() =>
    hasUnsavedChanges.value ? 'Plan and sync, unsaved changes' : 'Plan and sync',
  );
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
    <nav
      class="flex flex-row h-9 shrink-0 items-center z-20 bg-sage-100/95 border-b border-sage-300/40 px-1 gap-0.5"
    >
      <div class="relative shrink-0 flex items-center px-0.5 border-r border-sage-300/40">
        <button
          type="button"
          class="nav-icon-btn"
          :class="{ 'nav-icon-btn-active': planDrawerOpen }"
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
          v-if="hasUnsavedChanges"
          class="pointer-events-none absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-sage-100"
          aria-hidden="true"
        />
      </div>
      <RouterLink
        class="nav-tab"
        active-class="nav-tab-active"
        :to="guildsTabTo"
      >
        Guilds
      </RouterLink>
      <RouterLink
        class="nav-tab"
        active-class="nav-tab-active"
        :to="aerialTabTo"
      >
        Aerial
      </RouterLink>
      <RouterLink
        class="nav-tab"
        active-class="nav-tab-active"
        :to="{ name: routeNames.plants }"
      >
        Plants
      </RouterLink>
      <RouterLink
        class="nav-tab"
        active-class="nav-tab-active"
        :to="calendarTabTo"
      >
        Calendar
      </RouterLink>
    </nav>

    <PlanSessionDrawer v-model:open="planDrawerOpen" />

    <div class="flex-1 min-h-0 overflow-auto w-full">
      <RouterView />
    </div>

    <AppFooter />
  </div>
</template>
