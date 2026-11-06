<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { v4 as uuid } from 'uuid';
  import { useCameraStore } from './useCameraStore';
  import { usePointerSession } from './usePointerSession';
  import { clientToSvgUser } from './svgClientToUser';
  import {
    LANDMARK_RESIZE_HANDLES,
    landmarkAtPointer,
    type LandmarkGesture,
  } from './landmarkGeometry';
  import type { AerialTool } from './useAerialTool';
  import type { Landmark } from './gardenDocument';

  const props = withDefaults(
    defineProps<{
      width: number;
      height: number;
      showLabels?: boolean;
      landmarks: Landmark[];
      selectedId?: string;
      tool: AerialTool;
    }>(),
    { showLabels: true },
  );
  const emit = defineEmits<{ select: [id: string]; commit: [landmark: Landmark] }>();
  const camera = useCameraStore();
  const draft = ref<Landmark>();
  const displayed = computed(() => {
    const rows = props.landmarks.map((item) =>
      item.id === draft.value?.id ? draft.value : item,
    );
    if (draft.value && !rows.some((item) => item.id === draft.value?.id))
      rows.push(draft.value);
    return rows;
  });
  const handleSize = computed(() => 7 / (camera.scale * camera.zoom || 1));
  const resizeEdges = LANDMARK_RESIZE_HANDLES.filter(
    (handle) => handle.x === 0 || handle.y === 0,
  );
  const resizeCursors = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
  const session = usePointerSession();
  watch(() => [props.tool, props.landmarks], session.cancel, { flush: 'sync' });

  const start = (event: PointerEvent, gesture: LandmarkGesture) => {
    if (event.button !== 0 || (props.tool !== 'select' && props.tool !== 'landmark'))
      return;
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    session.cancel();
    const origin = clientToSvgUser(svg, event.clientX, event.clientY);
    // Snapshot the rectangle; the preview must never mutate the saved object.
    if (gesture.kind !== 'draw') {
      gesture = { ...gesture, landmark: { ...gesture.landmark } };
      emit('select', gesture.landmark.id);
    }
    session.start(event, {
      update: (next) => {
        draft.value = landmarkAtPointer(
          gesture,
          origin,
          clientToSvgUser(svg, next.clientX, next.clientY),
          handleSize.value,
        );
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
      pointerEvents: tool === 'select' || tool === 'landmark' ? 'auto' : 'none',
    }"
  >
    <g
      v-for="item in displayed"
      :key="item.id"
      :transform="`translate(${item.x} ${item.y}) rotate(${item.rotation})`"
    >
      <rect
        :x="-item.width / 2"
        :y="-item.height / 2"
        :width="item.width"
        :height="item.height"
        fill="#a98b6833"
        :stroke="selectedId === item.id ? '#315b45' : '#806344'"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        class="cursor-move"
        role="button"
        :aria-label="`Landmark: ${item.name}`"
        tabindex="0"
        @keydown.enter="emit('select', item.id)"
        @pointerdown="start($event, { kind: 'move', landmark: item })"
        @mousedown.stop
        @click.stop
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
      <g v-if="selectedId === item.id">
        <line
          x1="0"
          :y1="-item.height / 2"
          x2="0"
          :y2="-item.height / 2 - handleSize * 4"
          stroke="#315b45"
        />
        <circle
          cx="0"
          :cy="-item.height / 2 - handleSize * 4"
          :r="handleSize"
          fill="#315b45"
          aria-label="Rotate landmark"
          class="cursor-grab"
          @pointerdown="start($event, { kind: 'rotate', landmark: item })"
          @mousedown.stop
        />
        <line
          v-for="edge in resizeEdges"
          :key="edge.name"
          :x1="edge.x === 0 ? -item.width / 2 : (edge.x * item.width) / 2"
          :x2="edge.x === 0 ? item.width / 2 : (edge.x * item.width) / 2"
          :y1="edge.y === 0 ? -item.height / 2 : (edge.y * item.height) / 2"
          :y2="edge.y === 0 ? item.height / 2 : (edge.y * item.height) / 2"
          stroke="transparent"
          stroke-width="14"
          vector-effect="non-scaling-stroke"
          :aria-label="`Resize landmark ${edge.name} edge`"
          :style="{
            cursor: resizeCursors[Math.round((item.rotation + edge.angle) / 45) % 4],
          }"
          @pointerdown="
            start($event, { kind: 'resize', landmark: item, direction: edge })
          "
          @mousedown.stop
        />
        <rect
          v-for="handle in LANDMARK_RESIZE_HANDLES"
          :key="handle.name"
          :x="(handle.x * item.width) / 2 - handleSize / 2"
          :y="(handle.y * item.height) / 2 - handleSize / 2"
          :width="handleSize"
          :height="handleSize"
          fill="#315b45"
          :aria-label="`Resize landmark ${handle.name} handle`"
          :style="{
            cursor: resizeCursors[Math.round((item.rotation + handle.angle) / 45) % 4],
          }"
          @pointerdown="
            start($event, { kind: 'resize', landmark: item, direction: handle })
          "
          @mousedown.stop
        />
      </g>
    </g>
    <rect
      v-if="tool === 'landmark'"
      x="0"
      y="0"
      :width="width"
      :height="height"
      fill="transparent"
      class="cursor-crosshair"
      style="touch-action: none"
      aria-label="Draw landmark rectangle"
      @pointerdown="start($event, { kind: 'draw', id: uuid() })"
      @mousedown.stop
    />
  </g>
</template>
