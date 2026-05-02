<script lang="ts" setup>
import type { Plant } from './useGardenStore';

defineProps<{
  plant: Plant;
}>();
</script>
<template>
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
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
