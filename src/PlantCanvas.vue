<script lang="ts" setup>
import { computed, ref } from 'vue';
import type { Plant } from './useGardenStore';
import { usePlantFeatures } from './usePlantFeatures';

const props = defineProps<{ plant: Plant }>();

const { features, filter } = usePlantFeatures(computed(() => props.plant));

const container = ref<SVGElement>();
</script>
<template>
  <svg
    ref="container"
    class="w-full h-full"
    height="100%"
    width="100%"
    viewBox="0 0 100 100"
  >
    <use
      :xlink:href="'#' + plant.background"
      x="0"
      y="0"
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
