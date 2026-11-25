<script setup lang="ts">
  import { computed } from 'vue';
  import { SHAPE_FEATURES } from './mapShapeFeatures';
  import UiIcon from './uiIcons/UiIcon.vue';
  import {
    activateAerialTool,
    aerialTools,
    type AerialTool,
    type DrawingBrush,
    type MapFeature,
  } from './useAerialTool';
  import type { UiIconId } from './uiIcons/iconIds';

  const props = defineProps<{
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
  const actions = {
    setTool: (tool: AerialTool) => emit('update:activeTool', tool),
    setBrush: (brush: DrawingBrush) => emit('update:drawingBrush', brush),
  };
  const buttons = computed(() =>
    aerialTools.map((choice) => ({
      choice,
      pressed:
        props.activeTool === choice.tool &&
        (choice.tool !== 'draw' || choice.brush === props.drawingBrush),
      disabled:
        !props.canUseGuildTools &&
        (choice.tool === 'move' || (choice.tool === 'draw' && props.feature === 'guild')),
    })),
  );
</script>
<template>
  <div
    role="group"
    aria-label="Feature"
    class="map-toolbar [@container(min-width:40rem)]:shrink-0"
  >
    <button
      v-for="item in features"
      :key="item.id"
      type="button"
      class="inline-flex w-9 min-w-0 items-center justify-center gap-0.5 whitespace-nowrap capitalize [@container(min-width:40rem)]:w-auto [@container(min-width:40rem)]:px-1"
      :class="feature === item.id ? 'btn-soft-primary' : 'btn-soft-secondary'"
      :aria-pressed="feature === item.id"
      :title="item.label"
      :disabled="item.id === 'guild' && !canUseGuildTools"
      @click="emit('update:feature', item.id)"
    >
      <UiIcon :name="item.icon" />
      <span class="sr-only [@container(min-width:40rem)]:not-sr-only">{{
        item.label
      }}</span>
    </button>
  </div>
  <div
    role="toolbar"
    aria-label="Map tools"
    class="map-toolbar"
  >
    <button
      v-for="{ choice, pressed, disabled } in buttons"
      :key="choice.key"
      type="button"
      class="nav-icon-btn"
      :class="{ 'nav-icon-btn-active': pressed }"
      :aria-label="choice.label"
      :title="choice.label"
      :aria-pressed="pressed"
      :disabled="disabled"
      @click="activateAerialTool(choice, actions)"
    >
      <UiIcon :name="choice.icon" />
    </button>
  </div>
</template>
