<script setup lang="ts">
  import { computed, ref, watch } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import { useCameraStore } from './useCameraStore';
  import { usePointerSession } from './usePointerSession';
  import { clientToSvgUser } from './svgClientToUser';
  import { isEditableTarget } from './keyboardShortcuts';
  import type { AerialTool } from './useAerialTool';
  import type { PathPoint } from './guildPathClip';

  const props = defineProps<{
    points: PathPoint[];
    selected: boolean;
    tool: AerialTool;
    width: number;
    height: number;
  }>();
  const emit = defineEmits<{ select: []; commit: [points: PathPoint[]] }>();
  const camera = useCameraStore();
  const session = usePointerSession();
  const draft = ref<PathPoint[]>([]);
  const dragged = ref<PathPoint[]>();
  const cursor = ref<PathPoint>();
  const drawing = computed(() => props.tool === 'border' && !props.points.length);
  const displayed = computed(
    () => dragged.value ?? (drawing.value ? draft.value : props.points),
  );
  const radius = computed(() => 7 / (camera.scale * camera.zoom || 1));
  watch(
    () => [props.tool, props.points, props.selected],
    () => {
      session.cancel();
      draft.value = [];
      cursor.value = undefined;
    },
    { flush: 'sync' },
  );

  const finish = () => {
    if (draft.value.length) emit('commit', draft.value);
  };
  useEventListener(document, 'keydown', (event) => {
    if (
      !drawing.value ||
      isEditableTarget(event.target) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    if (event.key === 'Enter') {
      event.preventDefault();
      finish();
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      draft.value.pop();
    }
  });
  const addCorner = (event: MouseEvent) => {
    if (event.button !== 0) return;
    const svg = (event.currentTarget as SVGElement).closest('svg')!;
    const point = clientToSvgUser(svg, event.clientX, event.clientY);
    if (!draft.value.some((p) => p.x === point.x && p.y === point.y))
      draft.value.push(point);
  };
  const dragCorner = (event: PointerEvent, index: number) => {
    if (!props.selected || (props.tool !== 'select' && props.tool !== 'border')) return;
    const svg = (event.currentTarget as SVGElement).closest('svg')!;
    const original = props.points.map((point) => ({ ...point }));
    session.start(event, {
      update: (next) => {
        dragged.value = original.map((point, i) =>
          i === index ? clientToSvgUser(svg, next.clientX, next.clientY) : point,
        );
      },
      cancel: () => {
        dragged.value = undefined;
      },
      commit: () => {
        const points = dragged.value;
        dragged.value = undefined;
        if (points) emit('commit', points);
      },
    });
  };
</script>

<template>
  <g style="touch-action: none">
    <polygon
      v-if="props.points.length"
      :points="displayed.map((p) => `${p.x},${p.y}`).join(' ')"
      fill="none"
      stroke="#315b45"
      stroke-width="3"
      stroke-dasharray="9 5"
      vector-effect="non-scaling-stroke"
      :style="{
        pointerEvents: tool === 'select' || tool === 'border' ? 'stroke' : 'none',
      }"
      role="button"
      aria-label="Edit plot border"
      tabindex="0"
      @click.stop="emit('select')"
      @keydown.enter.stop="emit('select')"
      @mousedown.stop
    />
    <rect
      v-if="drawing"
      :width="width"
      :height="height"
      fill="transparent"
      class="cursor-crosshair"
      aria-label="Draw plot border"
      @mousedown.stop
      @click.stop="addCorner"
      @pointermove="
        cursor = clientToSvgUser(
          ($event.currentTarget as SVGElement).closest('svg')!,
          $event.clientX,
          $event.clientY,
        )
      "
    />
    <polyline
      v-if="drawing && draft.length"
      :points="
        [...draft, ...(cursor ? [cursor] : [])].map((p) => `${p.x},${p.y}`).join(' ')
      "
      fill="none"
      stroke="#315b45"
      stroke-width="2"
      vector-effect="non-scaling-stroke"
      pointer-events="none"
    />
    <g v-if="drawing || selected">
      <circle
        v-for="(point, index) in displayed"
        :key="index"
        :cx="point.x"
        :cy="point.y"
        :r="radius"
        fill="#faf6eb"
        stroke="#315b45"
        stroke-width="2"
        vector-effect="non-scaling-stroke"
        :aria-label="
          drawing && index === 0 ? 'Close plot border' : `Plot border corner ${index + 1}`
        "
        class="cursor-move"
        @mousedown.stop
        @click.stop="drawing && index === 0 && finish()"
        @pointerdown="dragCorner($event, index)"
      />
    </g>
  </g>
</template>
