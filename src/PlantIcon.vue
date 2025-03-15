<script lang="ts" setup>
import { computed } from 'vue';
import { type Plant } from './useGardenStore';
import { usePlantFeatures } from './usePlantFeatures';

const props = defineProps<{ plant: Plant }>();

const { features, filter } = usePlantFeatures(computed(() => props.plant));
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
      v-for="feature in features"
      :key="`${feature.feature}-${feature.x}-${feature.y}`"
      :xlink:href="'#' + feature.feature"
      :width="feature.width"
      :height="feature.height"
      :x="feature.x"
      :y="feature.y"
      :filter="filter"
    />
  </svg>
</template>
