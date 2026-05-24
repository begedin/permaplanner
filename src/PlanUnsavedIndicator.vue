<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { usePermaplannerStore } from './usePermaplannerStore';

const { unsavedChanges } = storeToRefs(usePermaplannerStore());
</script>

<template>
  <p
    v-if="unsavedChanges"
    class="px-1.5 py-1 rounded-lg text-xs font-medium text-amber-900 bg-amber-100/90 border border-amber-200/60"
    role="status"
    aria-live="polite"
  >
    Unsaved changes
  </p>
</template>
