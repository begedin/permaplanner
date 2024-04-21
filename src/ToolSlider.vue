<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: number
    min?: number
    max?: number
    step?: number
  }>(),
  { min: 0, max: 100, step: 1 },
)
</script>
<template>
  <label class="text-slate-600 flex flex-col gap-1">
    {{ label }}
    <div class="flex gap-2 flex-row items-center">
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="value"
        @input="$emit('update:value', parseInt(($event.target as HTMLInputElement).value))"
        class="flex-grow flex-shrink w-3/4"
      />
      <div class="w-8">{{ value }}</div>
    </div>
  </label>
</template>
