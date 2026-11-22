<script lang="ts" setup>
  import { computed } from 'vue';
  import type { GardenThing } from './gardenTypes';
  import { formatGuildMapDimensions, type PathBounds } from './guildPathBounds';
  import { useFutureView } from './useFutureView';
  import { useMapScaleStore } from './useMapScaleStore';
  const scale = useMapScaleStore();
  const future = useFutureView();
  const props = defineProps<{
    box: PathBounds;
    plant?: Readonly<GardenThing>;
    fontSize: number;
  }>();
  const format = new Intl.NumberFormat(undefined, { maximumSignificantDigits: 3 });
  const label = computed(() => {
    const plant = props.plant;
    if (!plant) return formatGuildMapDimensions(props.box, scale.measurement);
    const projected = future.footprint(plant);
    const { pixelsPerUnit, unit } = scale.measurement;
    const radius = (projected?.r ?? plant.width / 2) / pixelsPerUnit;
    const diameter = format.format(2 * radius);
    return `${diameter} × ${diameter} ${unit} · R ${format.format(radius)} ${unit}`;
  });
</script>
<template>
  <text
    v-if="label && box.width > 0 && box.height > 0"
    data-map-measure
    :id="plant ? `plant-size-${plant.id}` : undefined"
    :x="plant?.x ?? box.x"
    :y="plant?.y ?? box.y + box.height"
    :dy="plant ? '-0.4em' : '1.12em'"
    :font-size="fontSize"
    class="pointer-events-none"
    fill="red"
    >{{ label }}</text
  >
</template>
