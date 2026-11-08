<script setup lang="ts">
  import { ref, watch } from 'vue';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';

  const session = useGardenSessionStore();
  const dismissed = ref(false);
  watch(
    () => session.errorMessage,
    () => {
      dismissed.value = false;
    },
  );
</script>

<template>
  <div
    v-if="session.errorMessage && !dismissed"
    role="alert"
    aria-label="Garden save failed"
    class="fixed bottom-6 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg"
  >
    <div class="flex items-start gap-3">
      <div class="flex-1">
        <p class="font-semibold">Garden not saved</p>
        <p class="mt-1">{{ session.errorMessage }}</p>
        <button
          type="button"
          class="btn-soft-muted btn-soft-sm mt-3"
          :disabled="!session.canSave"
          @click="session.save()"
        >
          Retry save
        </button>
      </div>
      <button
        type="button"
        class="btn-icon flex size-7 shrink-0 items-center justify-center hover:bg-red-100"
        aria-label="Dismiss save error"
        @click="dismissed = true"
      >
        ×
      </button>
    </div>
  </div>
</template>
