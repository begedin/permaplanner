<script setup lang="ts">
  import { authGateMode } from './useAuthGate';

  const mode = authGateMode;
</script>

<template>
  <div
    v-if="mode === 'loading'"
    class="fixed inset-0 z-[100] flex items-center justify-center bg-parchment-100/95"
  >
    <p
      class="text-lg font-medium text-ink-700 animate-pulse"
      role="status"
      aria-live="polite"
    >
      Loading…
    </p>
  </div>
</template>
