<script setup lang="ts">
  import { computed } from 'vue';
  import { insideMap, moveWithinMap, useAerialMapBounds } from './aerialMapBounds';
  import { pathBounds } from './guildPathBounds';
  import { shapeMapPoints } from './mapShapeGeometry';
  import { SHAPE_FEATURES } from './mapShapeFeatures';
  import { translatePath, type PathPoint } from './guildPathClip';
  import { useGardenStore } from './useGardenStore';
  import { useCameraStore } from './useCameraStore';
  import { useMapShapeStore } from './useMapShapeStore';
  import { useMapScaleStore } from './useMapScaleStore';
  import { usePlotBorderStore } from './usePlotBorderStore';

  const world = useAerialMapBounds();
  const garden = useGardenStore();
  const camera = useCameraStore();
  const shapes = useMapShapeStore();
  const border = usePlotBorderStore();
  const reference = useMapScaleStore();

  const outside = computed(() => {
    const map = world.value;
    if (!map) return [];
    const items: { key: string; label: string; move: () => void }[] = [];
    const addIfOutside = (
      key: string,
      label: string,
      points: PathPoint[],
      move: (delta: PathPoint) => void,
      handleLabel?: (index: number) => string,
    ) => {
      if (!points.length) return;
      const bounds = pathBounds(points);
      if (handleLabel && (bounds.width > map.width || bounds.height > map.height)) {
        for (const [index, point] of points.entries()) {
          if (insideMap(point, map)) continue;
          items.push({
            key: `${key}-${index}`,
            label: handleLabel(index),
            move: () =>
              move({ x: camera.center.x - point.x, y: camera.center.y - point.y }),
          });
        }
        return;
      }
      const delta = moveWithinMap(bounds, map, points[0]);
      if (Math.abs(delta.x) > 1e-8 || Math.abs(delta.y) > 1e-8)
        items.push({ key, label, move: () => move(delta) });
    };
    for (const feature of ['path', 'landmark'] as const) {
      for (const shape of shapes.items(feature)) {
        addIfOutside(
          feature + shape.id,
          SHAPE_FEATURES[feature].label + ' · ' + shape.name,
          shapeMapPoints(shape),
          ({ x, y }) =>
            shapes.save(feature, { ...shape, x: shape.x + x, y: shape.y + y }),
        );
      }
    }
    for (const guild of garden.guilds) {
      addIfOutside(
        'guild' + guild.id,
        'Guild · ' + (guild.name || 'Unnamed guild'),
        guild.path.flat(2),
        (delta) => garden.setGuildPath(guild.id, translatePath(guild.path, delta), true),
      );
    }
    addIfOutside(
      'border',
      'Plot border',
      border.path.flatMap((polygon) => polygon.flatMap((ring) => ring.slice(0, -1))),
      border.translate,
      (index) => `Plot border corner ${index + 1}`,
    );
    addIfOutside(
      'reference',
      'Reference line',
      [reference.start, reference.end],
      reference.translateLine,
      (index) => (index === 0 ? 'Reference line start' : 'Reference line end'),
    );
    return items;
  });
</script>

<template>
  <fieldset
    v-if="outside.length"
    class="flex flex-col gap-1"
  >
    <legend class="mb-1 font-serif font-medium">Move onto map</legend>
    <button
      v-for="item in outside"
      :key="item.key"
      type="button"
      class="btn-soft px-2 py-1 text-left"
      @click="item.move"
    >
      {{ item.label }}
    </button>
  </fieldset>
</template>
