<script setup lang="ts">
  import { computed } from 'vue';
  import type { GardenThing } from './gardenTypes';
  import { useGardenStore } from './useGardenStore';
  import { plantGuildGroupEnglishLabel } from './resolvePlant';

  const props = defineProps<{ thing: Readonly<GardenThing>; fontSize: number }>();
  const garden = useGardenStore();
  const label = computed(() =>
    plantGuildGroupEnglishLabel(garden.resolvedPlant(props.thing.plantId)),
  );
</script>

<template>
  <text
    data-plant-label
    :x="thing.x + thing.width / 2"
    :y="thing.y + thing.height + fontSize * 1.2"
    :font-size="fontSize"
    text-anchor="middle"
    class="pointer-events-none font-serif"
    fill="#3d382b"
    stroke="#faf6eb"
    :stroke-width="fontSize * 0.28"
    paint-order="stroke"
    stroke-linejoin="round"
    >{{ label }}</text
  >
</template>
