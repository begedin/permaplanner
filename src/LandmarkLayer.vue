<script setup lang="ts">
  import { guildPathData, type GuildPath } from './guildPathClip';
  import { computed, ref, watch } from 'vue';
  import { useCameraStore } from './useCameraStore';
  import { transformClientPoint } from './svgClientToUser';
  import { usePointerSession } from './usePointerSession';
  import {
    LANDMARK_RESIZE_HANDLES,
    landmarkAtPointer,
    type LandmarkGesture,
  } from './landmarkGeometry';
  import type { AerialTool } from './useAerialTool';
  import type { Landmark } from './gardenDocument';

  const props = withDefaults(
    defineProps<{
      showLabels?: boolean;
      previewPath?: GuildPath;
      landmarks: readonly Landmark[];
      selectedId?: string;
      controlsTarget?: SVGGElement;
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
  const selectedLandmark = computed(() =>
    displayed.value.find((item) => item.id === props.selectedId),
  );
  const handleSize = computed(() => 7 / (camera.scale * camera.zoom || 1));
  const resizeEdges = LANDMARK_RESIZE_HANDLES.filter(
    (handle) => handle.x === 0 || handle.y === 0,
  );
  const resizeCursors = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];
  const session = usePointerSession();
  watch(() => [props.tool, props.landmarks], session.cancel, { flush: 'sync' });

  const start = (event: PointerEvent, gesture: LandmarkGesture) => {
    if (event.button !== 0 || props.tool !== 'select') return;
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    session.cancel();
    const matrix = svg.getScreenCTM()?.inverse();
    if (!matrix) return;
    // Selection can toggle the sidebar; keep this gesture in its starting frame.
    const toMapPoint = (event: PointerEvent) =>
      transformClientPoint(matrix, event.clientX, event.clientY);
    const origin = toMapPoint(event);
    gesture = { ...gesture, landmark: { ...gesture.landmark } };
    emit('select', gesture.landmark.id);
    session.start(event, {
      update: (next) => {
        draft.value = landmarkAtPointer(
          gesture,
          origin,
          toMapPoint(next),
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
      pointerEvents: tool === 'select' ? 'auto' : 'none',
    }"
  >
    <g
      v-for="item in displayed"
      :key="item.id"
      :transform="`translate(${item.x} ${item.y}) rotate(${item.rotation})`"
    >
      <path
        :d="
          guildPathData(
            item.path.map((polygon) =>
              polygon.map((ring) =>
                ring.map((p) => ({ x: p.x * item.width, y: p.y * item.height })),
              ),
            ),
          )
        "
        fill-rule="evenodd"
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
    </g>
    <path
      v-if="previewPath?.length"
      :d="guildPathData(previewPath)"
      fill="#a98b6833"
      stroke="#806344"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
      fill-rule="evenodd"
      pointer-events="none"
    />
    <Teleport
      v-if="selectedLandmark"
      :to="controlsTarget ?? 'body'"
      :disabled="!controlsTarget"
    >
      <g
        :transform="`translate(${selectedLandmark.x} ${selectedLandmark.y}) rotate(${selectedLandmark.rotation})`"
        :style="{ pointerEvents: tool === 'select' ? 'auto' : 'none' }"
        style="touch-action: none"
      >
        <line
          x1="0"
          :y1="-selectedLandmark.height / 2"
          x2="0"
          :y2="-selectedLandmark.height / 2 - handleSize * 4"
          stroke="#315b45"
        />
        <circle
          cx="0"
          :cy="-selectedLandmark.height / 2 - handleSize * 4"
          :r="handleSize"
          fill="#315b45"
          aria-label="Rotate landmark"
          class="cursor-grab"
          @pointerdown="start($event, { kind: 'rotate', landmark: selectedLandmark })"
          @mousedown.stop
        />
        <line
          v-for="edge in resizeEdges"
          :key="edge.name"
          :x1="
            edge.x === 0
              ? -selectedLandmark.width / 2
              : (edge.x * selectedLandmark.width) / 2
          "
          :x2="
            edge.x === 0
              ? selectedLandmark.width / 2
              : (edge.x * selectedLandmark.width) / 2
          "
          :y1="
            edge.y === 0
              ? -selectedLandmark.height / 2
              : (edge.y * selectedLandmark.height) / 2
          "
          :y2="
            edge.y === 0
              ? selectedLandmark.height / 2
              : (edge.y * selectedLandmark.height) / 2
          "
          stroke="transparent"
          stroke-width="14"
          vector-effect="non-scaling-stroke"
          :aria-label="`Resize landmark ${edge.name} edge`"
          :style="{
            cursor:
              resizeCursors[
                Math.round((selectedLandmark.rotation + edge.angle) / 45) % 4
              ],
          }"
          @pointerdown="
            start($event, { kind: 'resize', landmark: selectedLandmark, direction: edge })
          "
          @mousedown.stop
        />
        <rect
          v-for="handle in LANDMARK_RESIZE_HANDLES"
          :key="handle.name"
          :x="(handle.x * selectedLandmark.width) / 2 - handleSize / 2"
          :y="(handle.y * selectedLandmark.height) / 2 - handleSize / 2"
          :width="handleSize"
          :height="handleSize"
          fill="#315b45"
          :aria-label="`Resize landmark ${handle.name} handle`"
          :style="{
            cursor:
              resizeCursors[
                Math.round((selectedLandmark.rotation + handle.angle) / 45) % 4
              ],
          }"
          @pointerdown="
            start($event, {
              kind: 'resize',
              landmark: selectedLandmark,
              direction: handle,
            })
          "
          @mousedown.stop
        />
      </g>
    </Teleport>
  </g>
</template>
