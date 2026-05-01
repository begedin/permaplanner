<script lang="ts" setup>
import { computed } from 'vue';
import type { Plant } from './useGardenStore';

const props = defineProps<{
  plant: Plant;
  /** World-space box (optional; used when embedded in the garden SVG). */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}>();

const geometryAttrs = computed(() =>
  props.x !== undefined &&
  props.y !== undefined &&
  props.width !== undefined &&
  props.height !== undefined
    ? { x: props.x, y: props.y, width: props.width, height: props.height }
    : {},
);
</script>
<template>
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    data-garden-plant
    v-bind="geometryAttrs"
  >
    <text
      x="50"
      y="58"
      dominant-baseline="middle"
      text-anchor="middle"
      font-size="52"
      class="select-none"
    >
      {{ plant.emoji }}
    </text>
  </svg>
</template>
