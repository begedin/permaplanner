<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { GardenThing } from './data'

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

  const deltaX = (e.clientX - moveStartOffset.x) / props.scale
  const deltaY = (e.clientY - moveStartOffset.y) / props.scale

  console.log(deltaX, deltaY)

  const shape = { ...props.shape }

  if (movedWhich.value === 'topLeft') {
    emit('update', {
      ...shapeAtStartOfMove,
      x: shapeAtStartOfMove.x + deltaX,
      y: shapeAtStartOfMove.y + deltaY,
      width: shapeAtStartOfMove.width - deltaX,
      height: shapeAtStartOfMove.height - deltaY,
    })
  }

  if (movedWhich.value === 'bottomRight') {
    emit('update', {
      ...shapeAtStartOfMove,
      width: shapeAtStartOfMove.width + deltaX,
      height: shapeAtStartOfMove.height + deltaY,
    })
  }

  if (movedWhich.value === 'topRight') {
    emit('update', {
      ...shapeAtStartOfMove,
      y: shapeAtStartOfMove.y + deltaY,
      width: shapeAtStartOfMove.width + deltaX,
      height: shapeAtStartOfMove.height - deltaY,
    })
  }

  if (movedWhich.value === 'bottomLeft') {
    emit('update', {
      ...shape,
      x: shapeAtStartOfMove.x + deltaX,
      width: shapeAtStartOfMove.width - deltaX,
      height: shapeAtStartOfMove.height + deltaY,
    })
  }

  if (movedWhich.value === 'whole') {
    emit('update', {
      ...shapeAtStartOfMove,
      x: shapeAtStartOfMove.x + deltaX,
      y: shapeAtStartOfMove.y + deltaY,
    })
  }
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
    stroke-width="1"
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
    r="4"
    fill="fuchsia"
    class="hover:[r:8]"
    :class="p.which === movedWhich && '[fill:blue]'"
    @mousedown.stop="startMove($event, p.which)"
  />

  <use
    @mouseenter="hover = true"
    @mouseleave="hover = false"
    @click.shift="$emit('delete')"
    :xlink:href="`#${shape.kind}`"
    :x="shape.x"
    :y="shape.y"
    :width="shape.width"
    :height="shape.height"
    @click.stop="emit('click')"
    @mousedown.stop="startMove($event, 'whole')"
  />
</template>
