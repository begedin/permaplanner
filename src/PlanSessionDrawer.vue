<script setup lang="ts">
  import { computed, nextTick, ref } from 'vue';
  import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue';

  import PlanSessionPanel from './PlanSessionPanel.vue';
  import UiIcon from './uiIcons/UiIcon.vue';

  const props = defineProps<{ triggerElement?: HTMLElement }>();

  const open = defineModel<boolean>('open', { default: false });
  const closeButton = ref<HTMLButtonElement | null>(null);

  const closeButtonPosition = computed(() => {
    if (!open.value || !props.triggerElement) return undefined;
    const bounds = props.triggerElement.getBoundingClientRect();
    return { paddingLeft: `${bounds.left}px`, paddingTop: `${bounds.top}px` };
  });
</script>

<template>
  <TransitionRoot
    as="template"
    :show="open"
    appear
    @after-leave="nextTick(() => triggerElement?.focus())"
  >
    <Dialog
      class="fixed inset-0 z-50"
      aria-label="Plan"
      :initial-focus="closeButton"
      @close="open = false"
    >
      <TransitionChild
        as="div"
        class="relative flex h-full"
        enter="plan-drawer-enter-active"
        enter-from="plan-drawer-enter-from"
        leave="plan-drawer-leave-active"
        leave-to="plan-drawer-leave-to"
      >
        <button
          type="button"
          tabindex="-1"
          class="absolute inset-0 bg-ink-900/25 cursor-default"
          aria-label="Close plan menu"
          @click="open = false"
        />
        <DialogPanel
          as="aside"
          class="plan-drawer-panel relative flex flex-col w-[min(100%,280px)] max-w-full h-full paper-surface shadow-parchment-lg overflow-y-auto"
        >
          <div
            class="flex shrink-0 items-center justify-start border-b border-parchment-400/60 px-2 py-2"
            :style="closeButtonPosition"
          >
            <button
              ref="closeButton"
              type="button"
              class="nav-icon-btn w-auto gap-1 pr-2"
              aria-label="Close"
              title="Close"
              @click="open = false"
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
        </DialogPanel>
      </TransitionChild>
    </Dialog>
  </TransitionRoot>
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
