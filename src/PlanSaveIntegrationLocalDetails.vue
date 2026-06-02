<script setup lang="ts">
  import { usePlanSession } from './usePlanSession';

  const { saveAs } = usePlanSession();
</script>

<template>
  <button
    type="button"
    class="btn-soft-muted btn-soft-sm w-full p-1.5 text-left"
    @click="saveAs"
  >
    Save as…
  </button>
</template>
