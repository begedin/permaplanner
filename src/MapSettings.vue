<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useElementBounding, useWindowSize } from '@vueuse/core';
  import FutureViewControls from './FutureViewControls.vue';
  import GardenCalendarToggle from './GardenCalendarToggle.vue';
  import UiIcon from './uiIcons/UiIcon.vue';

  const props = defineProps<{ inHeader?: boolean }>();
  const open = ref(false);
  const toggle = ref<HTMLButtonElement>();
  const { top, bottom } = useElementBounding(() =>
    props.inHeader && open.value ? toggle.value : undefined,
  );
  const { height } = useWindowSize();
  const headerPanelStyle = computed(() => {
    if (!props.inHeader || !open.value) return;
    const below = height.value - bottom.value;
    return {
      [top.value > below ? 'bottom' : 'top']: '100%',
      maxHeight: `calc(${Math.max(top.value, below)}px - 0.75rem)`,
    };
  });
</script>

<template>
  <div
    class="text-sm"
    :class="
      inHeader
        ? 'relative shrink-0'
        : 'map-settings-aerial pointer-events-none absolute inset-x-2 bottom-2 z-10 flex max-h-[calc(100%-1rem)] flex-col-reverse items-center sm:items-end'
    "
    role="group"
    aria-label="Map settings"
  >
    <div
      class="pointer-events-auto flex max-w-full shrink-0 items-stretch gap-0.5 [@container(min-width:46rem)]:gap-1.5"
    >
      <slot name="tools" />
      <GardenCalendarToggle />
      <button
        ref="toggle"
        type="button"
        class="map-control-button"
        data-map-settings
        :aria-expanded="open"
        aria-controls="map-settings-controls"
        title="Map settings"
        @click="open = !open"
      >
        <UiIcon
          name="guilds"
          class="size-5"
        />
        <span class="sr-only sm:not-sr-only [@container(width<40rem)]:sr-only"
          >Map settings</span
        >
      </button>
    </div>
    <div
      id="map-settings-controls"
      data-map-settings
      class="pointer-events-auto flex min-h-0 flex-col"
      :class="
        inHeader
          ? 'absolute right-0 z-10 my-1 w-60 max-w-[calc(100vw-1.5rem)]'
          : 'max-w-full'
      "
      :style="headerPanelStyle"
      :inert="!open"
    >
      <Transition name="settings">
        <div
          v-if="open"
          class="paper-floating grid min-h-0 w-60 max-w-full grid-rows-[1fr]"
          :class="{ 'mb-1.5': !inHeader }"
        >
          <div class="min-h-0 overflow-y-auto overscroll-contain">
            <div class="flex flex-col gap-2 p-3">
              <slot />
              <FutureViewControls />
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
  @media (prefers-reduced-motion: no-preference) {
    .map-settings-aerial .settings-enter-active,
    .map-settings-aerial .settings-leave-active {
      transition:
        grid-template-rows 200ms ease-in-out,
        opacity 200ms ease-in-out;
    }

    .map-settings-aerial .settings-enter-from,
    .map-settings-aerial .settings-leave-to {
      grid-template-rows: 0fr;
      opacity: 0;
    }
  }
</style>
