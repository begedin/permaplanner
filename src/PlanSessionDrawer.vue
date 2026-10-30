<script setup lang="ts">
  import { computed } from 'vue';
  import { useEventListener } from '@vueuse/core';

  import PlanSessionPanel from './PlanSessionPanel.vue';
  import UiIcon from './uiIcons/UiIcon.vue';

  const props = defineProps<{ triggerElement?: HTMLElement }>();

  const open = defineModel<boolean>('open', { default: false });

  const closeButtonPosition = computed(() => {
    if (!open.value || !props.triggerElement) return undefined;
    const bounds = props.triggerElement.getBoundingClientRect();
    return { paddingLeft: `${bounds.left}px`, paddingTop: `${bounds.top}px` };
  });

  const close = () => {
    open.value = false;
  };

  useEventListener(document, 'keydown', (e) => {
    if (e.key === 'Escape' && open.value) close();
  });
</script>

<template>
  <Teleport to="body">
    <Transition
      name="plan-drawer"
      appear
    >
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex"
      >
        <button
          type="button"
          class="absolute inset-0 bg-ink-900/25 cursor-default"
          aria-label="Close plan menu"
          @click="close"
        />
        <aside
          class="plan-drawer-panel relative flex flex-col w-[min(100%,280px)] max-w-full h-full paper-surface shadow-parchment-lg overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Plan"
          @click.stop
        >
          <div
            class="flex shrink-0 items-center justify-start border-b border-parchment-400/60 px-2 py-2"
            :style="closeButtonPosition"
          >
            <button
              type="button"
              class="nav-icon-btn w-auto gap-1 pr-2"
              aria-label="Close"
              title="Close"
              @click="close"
            >
              <UiIcon
                name="remove"
                class="size-5"
              />
              <span>Close</span>
            </button>
          </div>
          <div class="flex flex-1 flex-col p-3">
            <PlanSessionPanel />
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .plan-drawer-enter-active,
  .plan-drawer-leave-active {
    transition: opacity 250ms ease;
  }

  .plan-drawer-enter-active .plan-drawer-panel,
  .plan-drawer-leave-active .plan-drawer-panel {
    transition: transform 250ms ease;
  }

  .plan-drawer-enter-from,
  .plan-drawer-leave-to {
    opacity: 0;
  }

  .plan-drawer-enter-from .plan-drawer-panel,
  .plan-drawer-leave-to .plan-drawer-panel {
    transform: translateX(-100%);
  }

  @media (prefers-reduced-motion: reduce) {
    .plan-drawer-enter-active,
    .plan-drawer-leave-active,
    .plan-drawer-enter-active .plan-drawer-panel,
    .plan-drawer-leave-active .plan-drawer-panel {
      transition: none;
    }
  }
</style>
