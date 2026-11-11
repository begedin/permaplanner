<script setup lang="ts">
  import { computed, ref, watch, type DeepReadonly } from 'vue';
  import { useCameraStore } from './useCameraStore';
  import { usePointerSession } from './usePointerSession';
  import { clientToSvgUser } from './svgClientToUser';
  import { cloneGuildPath, guildPathData, type GuildPath } from './guildPathClip';
  import type { AerialTool } from './useAerialTool';

  const props = defineProps<{
    path: DeepReadonly<GuildPath>;
    previewPath?: DeepReadonly<GuildPath>;
    selected: boolean;
    tool: AerialTool;
  }>();
  const emit = defineEmits<{ select: []; commit: [path: GuildPath] }>();
  const camera = useCameraStore();
  const session = usePointerSession();
  const draft = ref<GuildPath>();
  const displayed = computed(() => draft.value ?? props.previewPath ?? props.path);
  const corners = computed(() =>
    displayed.value.flatMap((polygon, polygonIndex) =>
      polygon.flatMap((ring, ringIndex) =>
        ring
          .slice(0, -1)
          .map((point, pointIndex) => ({ point, polygonIndex, ringIndex, pointIndex })),
      ),
    ),
  );
  const radius = computed(() => 7 / (camera.scale * camera.zoom || 1));
  watch(() => [props.path, props.tool, props.selected], session.cancel, {
    flush: 'sync',
  });
  const dragCorner = (event: PointerEvent, corner: (typeof corners.value)[number]) => {
    if (!props.selected || props.tool !== 'select') return;
    const svg = (event.currentTarget as SVGElement).closest('svg')!;
    const original = cloneGuildPath(props.path);
    session.start(event, {
      update: (next) => {
        const path = cloneGuildPath(original);
        const ring = path[corner.polygonIndex]![corner.ringIndex]!;
        const point = clientToSvgUser(svg, next.clientX, next.clientY);
        ring[corner.pointIndex] = point;
        if (corner.pointIndex === 0) ring[ring.length - 1] = { ...point };
        draft.value = path;
      },
      cancel: () => {
        draft.value = undefined;
      },
      commit: () => {
        const path = draft.value;
        draft.value = undefined;
        if (path) emit('commit', path);
      },
    });
  };
</script>
<template>
  <g style="touch-action: none">
    <path
      v-if="displayed.length"
      :d="guildPathData(displayed)"
      fill="none"
      stroke="#315b45"
      stroke-width="3"
      stroke-dasharray="9 5"
      vector-effect="non-scaling-stroke"
      :style="{ pointerEvents: tool === 'select' ? 'stroke' : 'none' }"
      role="button"
      aria-label="Edit plot border"
      tabindex="0"
      @click.stop="emit('select')"
      @keydown.enter.stop="emit('select')"
      @mousedown.stop
    />
    <g v-if="selected">
      <circle
        v-for="(corner, index) in corners"
        :key="index"
        :cx="corner.point.x"
        :cy="corner.point.y"
        :r="radius"
        fill="#faf6eb"
        stroke="#315b45"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        :aria-label="`Plot border corner ${index + 1}`"
        class="cursor-move"
        @mousedown.stop
        @pointerdown="dragCorner($event, corner)"
      />
    </g>
  </g>
</template>
