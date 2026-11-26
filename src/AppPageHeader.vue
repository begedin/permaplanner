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
  const tabs = computed(
    () =>
      [
        { label: 'Guilds', icon: 'guilds', to: guildsTabTo.value },
        { label: 'Plants', icon: 'plants', to: { name: routeNames.plants } },
        { label: 'Calendar', icon: 'calendar', to: calendarTabTo.value },
      ] as const,
  );
  const planDrawerOpen = ref(false);
  const planToggle = ref<HTMLButtonElement>();
  const { hasUnsavedChanges } = storeToRefs(useGardenSessionStore());
  const planMenuLabel = computed(() =>
    hasUnsavedChanges.value ? 'Plan, unsaved changes' : 'Plan',
  );
</script>

<template>
  <header
    class="grid shrink-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b border-parchment-400/60 paper-surface p-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-3"
  >
    <div class="contents lg:flex lg:min-w-0 lg:items-center lg:gap-3">
      <div class="flex shrink-0 items-center gap-1 px-0.5">
        <button
          ref="planToggle"
          type="button"
          class="nav-icon-btn relative"
          :class="{ 'nav-icon-btn-active': planDrawerOpen }"
          :aria-label="planMenuLabel"
          :aria-expanded="planDrawerOpen"
          @click="planDrawerOpen = !planDrawerOpen"
        >
          <UiIcon
            name="document"
            class="size-5"
          />
          <span
            v-if="hasUnsavedChanges"
            class="pointer-events-none absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-sage-100"
            aria-hidden="true"
          />
        </button>
        <slot name="menu" />
      </div>
      <div
        class="min-w-0 max-lg:order-last max-lg:col-span-full max-lg:has-[>h1]:sr-only"
      >
        <slot name="breadcrumb" />
      </div>
    </div>
    <nav
      aria-label="Main navigation"
      class="flex grid-cols-3 items-center gap-1 font-serif text-base min-[360px]:max-lg:grid lg:justify-center lg:text-lg"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.icon"
        class="nav-icon-btn h-7 w-auto shrink-0 gap-1 rounded-sm px-1.5 leading-6 lg:h-6"
        active-class="nav-icon-btn-active max-[360px]:flex-1 [&>span]:inline"
        :to="tab.to"
        :aria-label="tab.label"
        :title="tab.label"
      >
        <UiIcon
          :name="tab.icon"
          class="size-[18px]"
        />
        <span class="hidden min-[360px]:inline">{{ tab.label }}</span>
      </RouterLink>
    </nav>
    <div
      class="col-span-full flex min-w-0 flex-col justify-center gap-2 empty:hidden min-[368px]:flex-row min-[368px]:items-center lg:col-span-1 lg:justify-end"
    >
      <slot />
    </div>
  </header>
  <PlanSessionDrawer
    v-model:open="planDrawerOpen"
    :trigger-element="planToggle"
  />
</template>
