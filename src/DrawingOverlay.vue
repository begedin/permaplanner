<script setup lang="ts">
  import type { GuildPath, PathPoint } from './guildPathClip';
  import { guildPathData } from './guildPathClip';
  import type { DrawingBrush } from './useAerialTool';
  import { useCameraStore } from './useCameraStore';
  defineProps<{
    width: number;
    height: number;
    stroke: GuildPath;
    brush: PathPoint[];
    corners: PathPoint[];
    pointer: PathPoint;
    drawingBrush: DrawingBrush;
    strokeColor: string;
    brushColor: string;
  }>();
  const camera = useCameraStore();
</script>
<template>
  <g style="touch-action: none">
    <rect
      :width="width"
      :height="height"
      fill="transparent"
      class="cursor-crosshair"
      aria-label="Draw feature"
      @mousedown.stop
    />
    <path
      :d="
        guildPathData(stroke.length ? stroke : drawingBrush === 'path' ? [[brush]] : [])
      "
      fill-rule="evenodd"
      :fill="stroke.length ? strokeColor : brushColor"
      pointer-events="none"
      data-guild-brush
    />
    <polyline
      v-if="corners.length"
      :points="[...corners, pointer].map((p) => `${p.x},${p.y}`).join(' ')"
      fill="none"
      stroke="#315b45"
      vector-effect="non-scaling-stroke"
      pointer-events="none"
    />
    <circle
      v-for="(point, index) in corners"
      :key="index"
      :cx="point.x"
      :cy="point.y"
      :r="5 / (camera.scale * camera.zoom || 1)"
      fill="#315b45"
      pointer-events="none"
    />
  </g>
</template>
