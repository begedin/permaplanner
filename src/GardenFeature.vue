<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { GardenThing } from './useStore'

const props = defineProps<{ shape: GardenThing; active?: boolean; scale: number }>()
const emit = defineEmits<{
  (e: 'click' | 'delete'): void
  (e: 'update', shape: GardenThing): void
}>()

type Which = 'topLeft' | 'bottomRight' | 'topRight' | 'bottomLeft' | 'whole'

const points = computed<{ which: Exclude<Which, 'whole'>; x: number; y: number }[]>(() => [
  { which: 'topLeft', x: props.shape.x, y: props.shape.y },
  {
    which: 'bottomRight',
    x: props.shape.x + props.shape.width,
    y: props.shape.y + props.shape.height,
  },
  { which: 'topRight', x: props.shape.x + props.shape.width, y: props.shape.y },
  { which: 'bottomLeft', x: props.shape.x, y: props.shape.y + props.shape.height },
])

const hover = ref(false)

/**
 * Shape coordinates at mousedown.
 * Allows to correctly update the shape based on total amount moved
 */
const shapeAtStartOfMove = { ...props.shape }
/**
 * Offset mouse coordinates at mousedown.
 * Allows us to understand how much the mouse has moved during mousemove.
 */
const moveStartOffset = { x: 0, y: 0 }

/**
 * What is currently being moved. Either one of the corners or the whole shape.
 *
 * If null, no move is currently happening.
 */
const movedWhich = ref<Which | null>(null)

let moveController: AbortController | null = null

const startMove = (e: MouseEvent, which: Which) => {
  movedWhich.value = which
  moveStartOffset.x = e.clientX
  moveStartOffset.y = e.clientY
  shapeAtStartOfMove.x = props.shape.x
  shapeAtStartOfMove.y = props.shape.y
  shapeAtStartOfMove.width = props.shape.width
  shapeAtStartOfMove.height = props.shape.height

  moveController = new AbortController()

  document.addEventListener('mousemove', doMove, { signal: moveController.signal })
  document.addEventListener('mouseup', endMove, { signal: moveController.signal })
}

const doMove = (e: MouseEvent) => {
  if (!movedWhich.value) {
    return
  }

  const dX = (e.clientX - moveStartOffset.x) / props.scale
  const dY = (e.clientY - moveStartOffset.y) / props.scale

  if (movedWhich.value === 'whole') {
    emit('update', {
      ...props.shape,
      x: shapeAtStartOfMove.x + dX,
      y: shapeAtStartOfMove.y + dY,
    })
    return
  }

  const isMovingLeftEdge = ['bottomLeft', 'topLeft'].includes(movedWhich.value)
  const isMovingTopEdge = ['topLeft', 'topRight'].includes(movedWhich.value)

  const width = isMovingLeftEdge ? shapeAtStartOfMove.width - dX : shapeAtStartOfMove.width + dX
  const height = isMovingTopEdge ? shapeAtStartOfMove.height - dY : shapeAtStartOfMove.height + dY

  const x = isMovingLeftEdge ? shapeAtStartOfMove.x + dX : shapeAtStartOfMove.x
  const y = isMovingTopEdge ? shapeAtStartOfMove.y + dY : shapeAtStartOfMove.y

  emit('update', {
    ...shapeAtStartOfMove,
    x: Math.min(x, x + width),
    y: Math.min(y, y + height),
    width: Math.abs(width),
    height: Math.abs(height),
  })
}

const endMove = () => {
  movedWhich.value = null
  moveController?.abort()
}
</script>
<template>
  <rect
    v-if="hover || active"
    :x="shape.x"
    :y="shape.y"
    :width="shape.width"
    :height="shape.height"
    fill="transparent"
    :stroke-width="1 / scale"
    stroke="fuchsia"
    @click="emit('click')"
    @mousedown.stop="startMove($event, 'whole')"
  />

  <circle
    v-if="hover || active"
    v-for="p in points"
    :key="p.which"
    :cx="p.x"
    :cy="p.y"
    :r="4 / scale"
    fill="fuchsia"
    :class="[...[p.which === movedWhich && '[fill:blue]'], ...['hover:[fill:blue]']]"
    @mousedown.stop="startMove($event, p.which)"
  />

  <use
    @mouseenter="hover = true"
    @mouseleave="hover = false"
    @click.shift="$emit('delete')"
    :xlink:href="`#${shape.bgId}`"
    :x="shape.x"
    :y="shape.y"
    :width="shape.width"
    :height="shape.height"
    @click.stop="emit('click')"
    @mousedown.stop="startMove($event, 'whole')"
  />
  <use
    :xlink:href="`#${shape.layerId}`"
    :x="shape.x"
    :y="shape.y"
    :width="shape.width"
    :height="shape.height"
    class="pointer-events-none"
  />
</template>
