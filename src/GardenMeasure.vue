<script lang="ts" setup>
  import { computed, inject, ref } from 'vue';
  import { useResizeObserver } from '@vueuse/core';
  import type { GardenThing } from './gardenTypes';
  import { formatGuildMapDimensions, type PathBounds } from './guildPathBounds';
  import { useFutureView } from './useFutureView';
  import { useMapScaleStore } from './useMapScaleStore';
  import { mapViewportKey } from './useMapViewTransition';
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
    const meters = future.projectedWidthM(plant);
    if (meters === undefined && future.horizon === 'final') return 'Mature size unknown';
    const { pixelsPerUnit, metersPerUnit, unit: mapUnit } = scale.measurement;
    const unit = meters !== undefined && !metersPerUnit ? 'm' : mapUnit;
    const width =
      meters === undefined ? plant.width / pixelsPerUnit : meters / (metersPerUnit ?? 1);
    const diameter = format.format(width);
    return `${diameter} × ${diameter} ${unit} · R ${format.format(width / 2)} ${unit}`;
  });
  const viewport = inject(mapViewportKey, undefined);
  const text = ref<SVGTextElement>();
  const textWidth = ref(0);
  useResizeObserver(text, ([entry]) => {
    if (entry) textWidth.value = entry.contentRect.width;
  });
  const position = computed(() => {
    const plant = props.plant;
    if (!plant)
      return { x: props.box.x, y: props.box.y + props.box.height, dy: '1.12em' };
    const view = viewport?.value;
    if (!view) return { x: plant.x, y: plant.y, dy: '-0.4em' };
    const right = view.x + view.width;
    const bottom = view.y + view.height;
    if (
      plant.x > right ||
      plant.x + plant.width < view.x ||
      plant.y > bottom ||
      plant.y + plant.width < view.y
    )
      return { visibility: 'hidden' as const };
    const x = plant.x + textWidth.value > right ? plant.x - textWidth.value : plant.x;
    return {
      x: Math.max(view.x, Math.min(x, right - textWidth.value)),
      y: Math.max(plant.y, view.y),
      dy: plant.y - view.y < props.fontSize * 1.4 ? '1em' : '-0.4em',
    };
  });
</script>
<template>
  <text
    v-if="label && box.width > 0 && box.height > 0"
    :id="plant ? `plant-size-${plant.id}` : undefined"
    ref="text"
    data-map-measure
    v-bind="position"
    :font-size="fontSize"
    class="pointer-events-none"
    fill="red"
    >{{ label }}</text
  >
</template>
