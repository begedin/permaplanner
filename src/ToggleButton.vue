<script setup lang="ts">
  defineProps<{ disabled?: boolean }>();

  const model = defineModel<boolean>({ required: true });
</script>

<template>
  <button
    type="button"
    :aria-pressed="model"
    :disabled="disabled"
    class="rounded-lg border px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage-500 disabled:cursor-not-allowed disabled:opacity-50"
    :class="
      model
        ? 'border-sage-600 bg-sage-600 text-white'
        : 'border-parchment-400 bg-parchment-100 text-ink-600 enabled:hover:bg-parchment-200'
    "
    @click="model = !model"
  >
    <slot />
  </button>
</template>
