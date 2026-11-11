<script setup lang="ts">
  import { SHAPE_FEATURES } from './mapShapeFeatures';
  import UiIcon from './uiIcons/UiIcon.vue';
  import type { AerialTool, DrawingBrush, MapFeature } from './useAerialTool';
  import type { UiIconId } from './uiIcons/iconIds';

  defineProps<{
    activeTool: AerialTool;
    canUseGuildTools: boolean;
    feature: MapFeature;
    drawingBrush: DrawingBrush;
  }>();
  const emit = defineEmits<{
    'update:activeTool': [tool: AerialTool];
    'update:feature': [feature: MapFeature];
    'update:drawingBrush': [brush: DrawingBrush];
  }>();
  const features: { id: MapFeature; label: string; icon: UiIconId }[] = [
    { id: 'guild', label: 'guild', icon: 'guilds' },
    {
      id: 'landmark',
      label: SHAPE_FEATURES.landmark.label.toLowerCase(),
      icon: SHAPE_FEATURES.landmark.icon,
    },
    { id: 'path', label: SHAPE_FEATURES.path.label, icon: SHAPE_FEATURES.path.icon },
    { id: 'border', label: 'Plot border', icon: 'plot-border' },
  ];
  const brushes: { id: DrawingBrush; label: string; icon: UiIconId }[] = [
    { id: 'path', label: 'Path brush (B)', icon: 'edit' },
    { id: 'polygon', label: 'Polygon (P)', icon: 'polygon' },
    { id: 'rectangle', label: 'Bounding box (R)', icon: 'rectangle' },
  ];
</script>
<template>
  <div
    class="paper-floating pointer-events-auto flex w-max max-w-full shrink-0 flex-col gap-1 p-1.5"
  >
    <div
      role="group"
      aria-label="Feature"
      class="flex flex-wrap gap-1"
    >
      <button
        v-for="item in features"
        :key="item.id"
        type="button"
        class="btn-soft inline-flex items-center gap-1.5 px-2 py-1 capitalize"
        :class="feature === item.id ? 'btn-soft-primary' : 'btn-soft-secondary'"
        :aria-pressed="feature === item.id"
        :disabled="item.id === 'guild' && !canUseGuildTools"
        @click="emit('update:feature', item.id)"
      >
        <UiIcon :name="item.icon" />
        <span>{{ item.label }}</span>
      </button>
    </div>
    <div
      role="toolbar"
      aria-label="Map tools"
      class="map-toolbar flex flex-wrap gap-1"
    >
      <button
        type="button"
        class="nav-icon-btn"
        :class="{ 'nav-icon-btn-active': activeTool === 'select' }"
        aria-label="Select (V)"
        title="Select (V)"
        :aria-pressed="activeTool === 'select'"
        @click="emit('update:activeTool', 'select')"
      >
        <UiIcon name="pointer" />
      </button>
      <button
        v-for="brush in brushes"
        :key="brush.id"
        type="button"
        class="nav-icon-btn"
        :class="{
          'nav-icon-btn-active': drawingBrush === brush.id && activeTool === 'draw',
        }"
        :aria-label="brush.label"
        :title="brush.label"
        :aria-pressed="drawingBrush === brush.id && activeTool === 'draw'"
        :disabled="feature === 'guild' && !canUseGuildTools"
        @click="emit('update:drawingBrush', brush.id)"
      >
        <UiIcon :name="brush.icon" />
      </button>
      <button
        type="button"
        class="nav-icon-btn"
        :class="{ 'nav-icon-btn-active': activeTool === 'move' }"
        aria-label="Move guild (M)"
        title="Move guild (M)"
        :aria-pressed="activeTool === 'move'"
        :disabled="!canUseGuildTools"
        @click="emit('update:activeTool', 'move')"
      >
        <UiIcon name="move" />
      </button>
    </div>
  </div>
</template>
