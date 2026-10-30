<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  import PlanSessionDrawer from './PlanSessionDrawer.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { useCalendarSelection } from './useCalendarSelection';
  import { useGuildSelection } from './useGuildSelection';
  import { routeNames } from './router';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';

  const { guildsTabTo } = useGuildSelection();
  const { calendarTabTo } = useCalendarSelection();
  const planDrawerOpen = ref(false);
  const planToggle = ref<HTMLButtonElement>();
  const { hasUnsavedChanges } = storeToRefs(useGardenSessionStore());
  const planMenuLabel = computed(() =>
    hasUnsavedChanges.value ? 'Plan, unsaved changes' : 'Plan',
  );
</script>

<template>
  <header
    class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 shrink-0 border-b border-parchment-400/60 paper-surface px-2 py-2"
  >
    <div class="flex min-w-0 items-center justify-start gap-3">
      <div class="relative shrink-0 flex items-center px-0.5">
        <button
          ref="planToggle"
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
      <div class="min-w-0">
        <slot name="breadcrumb" />
      </div>
    </div>
    <nav
      aria-label="Main navigation"
      class="flex items-center justify-center gap-1 text-lg"
    >
      <RouterLink
        class="nav-icon-btn compact-nav-button"
        active-class="nav-icon-btn-active"
        :to="guildsTabTo"
        aria-label="Guilds"
        title="Guilds"
      >
        <UiIcon
          name="guilds"
          class="size-[18px]"
        />
        <span>Guilds</span>
      </RouterLink>
      <RouterLink
        class="nav-icon-btn compact-nav-button"
        active-class="nav-icon-btn-active"
        :to="{ name: routeNames.plants }"
        aria-label="Plants"
        title="Plants"
      >
        <UiIcon
          name="plants"
          class="size-[18px]"
        />
        <span>Plants</span>
      </RouterLink>
      <RouterLink
        class="nav-icon-btn compact-nav-button"
        active-class="nav-icon-btn-active"
        :to="calendarTabTo"
        aria-label="Calendar"
        title="Calendar"
      >
        <UiIcon
          name="calendar"
          class="size-[18px]"
        />
        <span>Calendar</span>
      </RouterLink>
    </nav>
    <div class="flex min-w-0 items-center justify-end gap-2">
      <slot />
    </div>
  </header>
  <PlanSessionDrawer
    v-model:open="planDrawerOpen"
    :trigger-element="planToggle"
  />
</template>

<style scoped>
  .compact-nav-button {
    width: auto;
    flex-shrink: 0;
    gap: 4px;
    padding: 0 6px;
    height: 24px;
    line-height: 24px;
    border-radius: 4px;
  }
</style>
