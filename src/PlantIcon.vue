<script lang="ts" setup>
import { type Plant } from './useGardenStore';
defineProps<{ plant: Plant }>();
</script>
<template>
  <svg
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    data-garden-plant
  >
    <use
      :xlink:href="'#' + plant.background"
      width="100%"
      height="100%"
    />
    <use
      v-for="feature in plant.features"
      :key="feature.feature"
      :xlink:href="'#' + feature.feature"
      :width="feature.width"
      :height="feature.height"
      :x="feature.x"
      :y="feature.y"
    />
  </svg>
</template>
