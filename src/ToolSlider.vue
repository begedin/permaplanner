<script setup lang="ts">
  import { onScopeDispose } from 'vue';
  import { useEventListener } from '@vueuse/core';

  withDefaults(
    defineProps<{
      label: string;
      value: number;
      min?: number;
      max?: number;
      step?: number;
    }>(),
    { min: 0, max: 100, step: 1 },
  );

  const emit = defineEmits<{
    (e: 'update:value', value: number, token: symbol): void;
  }>();
  let token: symbol | undefined;
  let pointerActive = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const endInteraction = () => {
    clearTimeout(idleTimer);
    idleTimer = undefined;
    token = undefined;
    pointerActive = false;
  };

  const startPointerInteraction = () => {
    endInteraction();
    pointerActive = true;
    token = Symbol('slider edit');
  };

  const updateValue = (event: Event) => {
    token ??= Symbol('slider edit');
    emit('update:value', Number((event.target as HTMLInputElement).value), token);
    clearTimeout(idleTimer);
    if (!pointerActive) idleTimer = setTimeout(endInteraction, 500);
  };

  useEventListener(window, ['pointerup', 'pointercancel'], () => {
    if (pointerActive) endInteraction();
  });
  onScopeDispose(endInteraction);
</script>
<template>
  <label class="text-ink-600 flex flex-col gap-1">
    {{ label }}
    <div class="flex gap-2 flex-row items-center">
      <input
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="value"
        class="flex-grow flex-shrink w-3/4 accent-sage-600"
        @pointerdown="startPointerInteraction"
        @input="updateValue"
        @blur="endInteraction"
      />
      <div class="w-8">{{ value }}</div>
    </div>
  </label>
</template>
