<script setup lang="ts" generic="T extends string | number">
  defineProps<{
    name: string;
    label: string;
    options: readonly { value: T; label: string }[];
    disabled?: boolean;
  }>();

  const model = defineModel<T>({ required: true });
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    :aria-disabled="disabled || undefined"
    class="inline-flex rounded-lg border border-parchment-400 bg-parchment-100 p-0.5 text-xs text-ink-600"
  >
    <label
      v-for="option in options"
      :key="option.value"
      :class="disabled ? 'cursor-not-allowed' : 'cursor-pointer'"
    >
      <input
        v-model="model"
        type="radio"
        :name="name"
        :value="option.value"
        :disabled="disabled"
        class="sr-only peer"
      />
      <span
        class="block rounded-md px-2 py-1 peer-checked:bg-sage-600 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-sage-500 peer-focus-visible:ring-offset-1 peer-disabled:opacity-50"
        :class="{ 'hover:bg-parchment-200': !disabled }"
      >
        {{ option.label }}
      </span>
    </label>
  </div>
</template>
