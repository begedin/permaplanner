<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useElementBounding, useWindowSize } from '@vueuse/core';
  import FutureViewControls from './FutureViewControls.vue';
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
    data-map-settings
    class="text-sm"
    :class="inHeader ? 'map-settings-header' : 'map-settings-aerial'"
    role="group"
    aria-label="Map settings"
  >
    <button
      ref="toggle"
      type="button"
      class="flex shrink-0 items-center gap-1"
      :aria-expanded="open"
      aria-controls="map-settings-controls"
      @click="open = !open"
    >
      <UiIcon
        name="guilds"
        class="size-5"
      />
      Map settings
    </button>
    <div
      id="map-settings-controls"
      class="flex min-h-0 flex-col"
      :style="headerPanelStyle"
      :inert="!open"
    >
      <Transition name="settings">
        <div
          v-if="open"
          class="settings-panel grid min-h-0 grid-rows-[1fr]"
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
