<script setup lang="ts">
  import { computed, type DeepReadonly } from 'vue';
  import { hasPlantPlacement, type GardenThing } from './gardenTypes';
  import { useFutureView } from './useFutureView';

  const props = defineProps<{ plants: DeepReadonly<GardenThing[]> }>();
  const future = useFutureView();
  const outlines = computed(() => {
    if (future.horizon === 'now') return [];
    return props.plants.filter(hasPlantPlacement).flatMap((plant) => {
      const circle = future.footprint(plant);
      return circle ? [{ id: plant.id, name: plant.nameOrCultivar, circle }] : [];
    });
  });
</script>

<template>
  <g
    v-if="outlines.length"
    class="pointer-events-none"
    aria-label="Estimated plant spreads"
    stroke="#754819"
    stroke-width="2"
    stroke-dasharray="6 4"
    fill="#d88f33"
    fill-opacity=".09"
  >
    <circle
      v-for="outline in outlines"
      :key="outline.id"
      v-bind="outline.circle"
      vector-effect="non-scaling-stroke"
      :aria-label="outline.name"
    />
  </g>
</template>
