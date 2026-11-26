<script setup lang="ts">
  import { guildPathData, type GuildPath } from './guildPathClip';
  import { computed, ref, watch } from 'vue';
  import MapShapeResizeControls from './MapShapeResizeControls.vue';
  import { useCameraStore } from './useCameraStore';
  import { transformClientPoint } from './svgClientToUser';
  import { trackDragMovement, usePointerSession } from './usePointerSession';
  import {
    SHAPE_RESIZE_EDGES,
    startShapeDrag,
    type ShapeGesture,
  } from './mapShapeGeometry';
  import type { AerialTool } from './useAerialTool';
  import { SHAPE_FEATURES, type ShapeFeature } from './mapShapeFeatures';
  import { useAerialMapBounds } from './aerialMapBounds';
  import type { MapShape } from './gardenDocument';

  const props = withDefaults(
    defineProps<{
      showLabels?: boolean;
      feature: ShapeFeature;
      previewPath?: GuildPath;
      shapes: readonly MapShape[];
      selectedId?: string;
      controlsTarget?: SVGGElement;
      resizeTarget?: SVGGElement;
      tool: AerialTool;
    }>(),
    { showLabels: true },
  );
  const appearance = computed(() => SHAPE_FEATURES[props.feature]);
  const emit = defineEmits<{ select: [id: string]; commit: [shape: MapShape] }>();
  const world = useAerialMapBounds();
  const camera = useCameraStore();
  const draft = ref<MapShape>();
  const outlines = computed(() => props.shapes.map((shape) => guildPathData(shape.path)));
  const displayed = computed(() =>
    props.shapes.map((shape) => (shape.id === draft.value?.id ? draft.value : shape)),
  );
  const selectedShape = computed(() =>
    displayed.value.find((item) => item.id === props.selectedId),
  );
  const handleSize = computed(() => 7 / (camera.scale * camera.zoom || 1));
  let grabbedRotationEdge: (typeof SHAPE_RESIZE_EDGES)[number] | undefined;
  const rotationGrip = computed(() => {
    const shape = selectedShape.value;
    if (!shape) return;
    const angle = (shape.rotation * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const halfWidth = (Math.abs(cos) * shape.width + Math.abs(sin) * shape.height) / 2;
    const halfHeight = (Math.abs(sin) * shape.width + Math.abs(cos) * shape.height) / 2;
    if (
      shape.x + halfWidth < camera.x ||
      shape.x - halfWidth > camera.x + camera.width ||
      shape.y + halfHeight < camera.y ||
      shape.y - halfHeight > camera.y + camera.height
    )
      return;
    const margin = 2 * handleSize.value;
    let best;
    let shortest = Infinity;
    for (const edge of draft.value && grabbedRotationEdge
      ? [grabbedRotationEdge]
      : SHAPE_RESIZE_EDGES) {
      const dx = cos * edge.x - sin * edge.y;
      const dy = sin * edge.x + cos * edge.y;
      const halfSize = (edge.x ? shape.width : shape.height) / 2;
      const x1 = shape.x + dx * halfSize;
      const y1 = shape.y + dy * halfSize;
      const tipX = x1 + dx * 4 * handleSize.value;
      const tipY = y1 + dy * 4 * handleSize.value;
      const x2 = Math.max(
        camera.x + margin,
        Math.min(tipX, camera.x + camera.width - margin),
      );
      const y2 = Math.max(
        camera.y + margin,
        Math.min(tipY, camera.y + camera.height - margin),
      );
      const distance = Math.hypot(tipX - x2, tipY - y2);
      if (distance < shortest) {
        best = { edge, line: { x1, y1, x2, y2 } };
        shortest = distance;
        if (distance === 0) break;
      }
    }
    return best;
  });
  const session = usePointerSession();
  watch(() => [props.tool, props.shapes, world.value], session.cancel, { flush: 'sync' });

  const start = (event: PointerEvent, gesture: ShapeGesture) => {
    if (event.button !== 0 || props.tool !== 'select') return;
    const touch = event.pointerType === 'touch';
    if (
      touch &&
      (!event.isPrimary ||
        (gesture.kind === 'move' && gesture.shape.id !== props.selectedId))
    )
      return;
    if (!world.value) {
      if (!touch) emit('select', gesture.shape.id);
      return;
    }
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    session.cancel();
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return;
    // Selection can toggle the sidebar; keep this gesture in its starting frame.
    const toMapPoint = (event: PointerEvent) =>
      transformClientPoint(matrix, event.clientX, event.clientY);
    const origin = toMapPoint(event);
    const moved = trackDragMovement(event);
    grabbedRotationEdge =
      gesture.kind === 'rotate' ? rotationGrip.value?.edge : undefined;
    gesture = { ...gesture, shape: { ...gesture.shape } };
    const drag = startShapeDrag(gesture, origin, handleSize.value, world.value);
    emit('select', gesture.shape.id);
    session.start(event, {
      update: (next) => {
        draft.value = moved(next) ? drag(toMapPoint(next)) : undefined;
      },
      cancel: () => {
        draft.value = undefined;
      },
      commit: () => {
        const result = draft.value;
        draft.value = undefined;
        if (result && result.width > 0 && result.height > 0) emit('commit', result);
      },
    });
  };
</script>

<template>
  <g
    style="touch-action: none"
    :style="{
      pointerEvents: tool === 'select' ? 'auto' : 'none',
    }"
  >
    <g
      v-for="(item, index) in displayed"
      :key="item.id"
      :transform="`translate(${item.x} ${item.y}) rotate(${item.rotation})`"
    >
      <path
        :d="outlines[index]"
        :transform="`scale(${item.width} ${item.height})`"
        fill-rule="evenodd"
        :data-map-feature="selectedId === item.id ? 'selected' : ''"
        :fill="appearance.fill"
        :stroke="selectedId === item.id ? '#315b45' : appearance.stroke"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        class="cursor-move"
        role="button"
        :aria-label="`${appearance.label}: ${item.name}`"
        tabindex="0"
        @keydown.enter="emit('select', item.id)"
        @pointerdown="start($event, { kind: 'move', shape: item })"
        @mousedown.stop
        @click.stop="$event.detail === 0 && tool === 'select' && emit('select', item.id)"
      />
      <text
        v-if="showLabels"
        text-anchor="middle"
        dominant-baseline="middle"
        class="pointer-events-none font-serif"
        :font-size="camera.mapLabelFontSize"
        fill="#463c2c"
        stroke="#faf6eb"
        :stroke-width="(handleSize * 2) / 7"
        paint-order="stroke"
        stroke-linejoin="round"
        >{{ item.name }}</text
      >
    </g>
    <path
      v-if="previewPath?.length"
      :d="guildPathData(previewPath)"
      :fill="appearance.fill"
      :stroke="appearance.stroke"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
      fill-rule="evenodd"
      pointer-events="none"
    />
    <Teleport
      v-if="world && selectedShape && tool === 'select'"
      :to="resizeTarget ?? controlsTarget ?? 'body'"
      :disabled="!resizeTarget && !controlsTarget"
    >
      <MapShapeResizeControls
        :key="selectedShape.id"
        :shape="selectedShape"
        :feature="feature"
        :size="handleSize"
        :map="resizeTarget?.ownerSVGElement ?? undefined"
        @resize="start"
      />
    </Teleport>
    <Teleport
      v-if="selectedShape"
      :to="controlsTarget ?? 'body'"
      :disabled="!controlsTarget"
    >
      <g
        v-if="rotationGrip"
        :style="{ pointerEvents: tool === 'select' ? 'auto' : 'none' }"
      >
        <line
          v-bind="rotationGrip.line"
          stroke="#315b45"
          pointer-events="none"
        />
        <circle
          :cx="rotationGrip.line.x2"
          :cy="rotationGrip.line.y2"
          :r="handleSize"
          fill="#315b45"
          :aria-label="`Rotate ${appearance.label.toLowerCase()}`"
          class="cursor-grab"
          @pointerdown="start($event, { kind: 'rotate', shape: selectedShape })"
          @mousedown.stop
        />
      </g>
    </Teleport>
  </g>
</template>
