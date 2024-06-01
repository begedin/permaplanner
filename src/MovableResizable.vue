<script lang="ts" setup>
import { computed, ref } from 'vue';

const props = defineProps<{
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  active: boolean;
}>();
const emit = defineEmits<{
  (e: 'click'): void;
  (e: 'update', payload: { x: number; y: number; width: number; height: number }): void;
}>();

type Which = 'topLeft' | 'bottomRight' | 'topRight' | 'bottomLeft' | 'whole';

const points = computed<{ which: Exclude<Which, 'whole'>; x: number; y: number }[]>(() => [
  { which: 'topLeft', x: props.x, y: props.y },
  {
    which: 'bottomRight',
    x: props.x + props.width,
    y: props.y + props.height,
  },
  { which: 'topRight', x: props.x + props.width, y: props.y },
  { which: 'bottomLeft', x: props.x, y: props.y + props.height },
]);

/**
 * Shape coordinates at mousedown.
 * Allows to correctly update the shape based on total amount moved
 */
const shapeAtStartOfMove = { ...props };
/**
 * Offset mouse coordinates at mousedown.
 * Allows us to understand how much the mouse has moved during mousemove.
 */
const moveStartOffset = { x: 0, y: 0 };

/**
 * What is currently being moved. Either one of the corners or the whole shape.
 *
 * If null, no move is currently happening.
 */
const movedWhich = ref<Which | null>(null);

let moveController: AbortController | null = null;

const startMove = (e: MouseEvent, which: Which) => {
  movedWhich.value = which;
  moveStartOffset.x = e.clientX;
  moveStartOffset.y = e.clientY;
  shapeAtStartOfMove.x = props.x;
  shapeAtStartOfMove.y = props.y;
  shapeAtStartOfMove.width = props.width;
  shapeAtStartOfMove.height = props.height;

  moveController = new AbortController();

  document.addEventListener('mousemove', doMove, { signal: moveController.signal });
  document.addEventListener('mouseup', endMove, { signal: moveController.signal });
};

const doMove = (e: MouseEvent) => {
  if (!movedWhich.value) {
    return;
  }

  const dX = (e.clientX - moveStartOffset.x) / props.scale;
  const dY = (e.clientY - moveStartOffset.y) / props.scale;

  if (movedWhich.value === 'whole') {
    emit('update', {
      x: shapeAtStartOfMove.x + dX,
      y: shapeAtStartOfMove.y + dY,
      width: shapeAtStartOfMove.width,
      height: shapeAtStartOfMove.height,
    });
    return;
  }

  const isMovingLeftEdge = ['bottomLeft', 'topLeft'].includes(movedWhich.value);
  const isMovingTopEdge = ['topLeft', 'topRight'].includes(movedWhich.value);

  const width = isMovingLeftEdge ? shapeAtStartOfMove.width - dX : shapeAtStartOfMove.width + dX;
  const height = isMovingTopEdge ? shapeAtStartOfMove.height - dY : shapeAtStartOfMove.height + dY;

  const x = isMovingLeftEdge ? shapeAtStartOfMove.x + dX : shapeAtStartOfMove.x;
  const y = isMovingTopEdge ? shapeAtStartOfMove.y + dY : shapeAtStartOfMove.y;

  emit('update', {
    ...shapeAtStartOfMove,
    x: Math.min(x, x + width),
    y: Math.min(y, y + height),
    width: Math.abs(width),
    height: Math.abs(height),
  });
};

const endMove = () => {
  movedWhich.value = null;
  moveController?.abort();
};

const hover = ref(false);
</script>
<template>
  <rect
    v-if="active || hover"
    :x="x"
    :y="y"
    :width="width"
    :height="height"
    fill="transparent"
    :stroke-width="1 / scale"
    stroke="fuchsia"
    @click="emit('click')"
    @mousedown.stop="startMove($event, 'whole')"
  />
  <template v-if="active || hover">
    <circle
      v-for="p in points"
      :key="p.which"
      :cx="p.x"
      :cy="p.y"
      :r="4 / scale"
      fill="fuchsia"
      :class="[...[p.which === movedWhich && '[fill:blue]'], ...['hover:[fill:blue]']]"
      @mousedown.stop="startMove($event, p.which)"
    />
  </template>
  <g
    @mousedown.stop="startMove($event, 'whole')"
    @mouseenter="hover = true"
    @mouseleave="hover = false"
  >
    <slot />
  </g>
</template>
