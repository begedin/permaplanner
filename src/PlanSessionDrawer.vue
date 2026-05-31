<script setup lang="ts">
  import { onBeforeUnmount, watch } from 'vue';

  import PlanSessionPanel from './PlanSessionPanel.vue';

  const open = defineModel<boolean>('open', { default: false });

  const close = () => {
    open.value = false;
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open.value) {
      close();
    }
  };

  watch(
    () => open.value,
    (isOpen) => {
      if (isOpen) {
        document.addEventListener('keydown', onKeydown);
      } else {
        document.removeEventListener('keydown', onKeydown);
      }
    },
  );

  onBeforeUnmount(() => {
    document.removeEventListener('keydown', onKeydown);
  });
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex"
    >
      <button
        type="button"
        class="absolute inset-0 bg-ink-900/25 cursor-default transition-opacity duration-200 ease-out"
        aria-label="Close plan menu"
        @click="close"
      />
      <aside
        class="relative flex flex-col w-[min(100%,280px)] max-w-full h-full paper-surface shadow-parchment-lg overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Plan and sync"
        @click.stop
      >
        <div
          class="flex shrink-0 items-center justify-end border-b border-parchment-400/60 px-2 py-1.5"
        >
          <button
            type="button"
            class="text-sm text-ink-600 hover:text-ink-900 hover:bg-parchment-200/80 rounded-lg px-2 py-1 transition-colors"
            @click="close"
          >
            Close
          </button>
        </div>
        <div class="p-3">
          <PlanSessionPanel />
        </div>
      </aside>
    </div>
  </Teleport>
</template>
