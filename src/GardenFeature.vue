<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { GardenThing } from './data'

const props = defineProps<{ shape: GardenThing; active?: boolean }>()
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
    y: props.shape.y + props.shape.height
  },
  { which: 'topRight', x: props.shape.x + props.shape.width, y: props.shape.y },
  { which: 'bottomLeft', x: props.shape.x, y: props.shape.y + props.shape.height }
])

const hover = ref(false)

/**
 * Offset of the mouse cursor from the top left point of the shape
 * at the moment a move action starts.
 *
 * Allows correct positioning when moving the entire shape at once.
 */
const movedInnerOffset = ref<{ x: number; y: number }>({ x: 0, y: 0 })

const getUpdatedShape = (which: Which, x: number, y: number) => {
  const shape = { ...props.shape }
  if (which === 'topLeft') {
    return {
      ...shape,
      x,
      y,
      width: shape.width + shape.x - x,
      height: shape.height + shape.y - y
    }
  }

  if (which === 'bottomRight') {
    return {
      ...shape,
      width: x - shape.x,
      height: y - shape.y
    }
  }

  if (which === 'topRight') {
    return {
      ...shape,
      y,
      width: x - shape.x,
      height: shape.height + shape.y - y
    }
  }

  if (which === 'bottomLeft') {
    return {
      ...shape,
      x,
      width: shape.width + shape.x - x,
      height: y - shape.y
    }
  }

  if (which === 'whole') {
    return { ...shape, x: x - movedInnerOffset.value.x, y: y - movedInnerOffset.value.y }
  }

  return shape
}

/**
 * The amount of pixels we need to do for a move action to trigger.
 * Otherwise, it results in a click action.
 */
const MOVE_THRESHOLD = 5

/**
 * What is currently being moved. Either one of the corners or the whole shape.
 *
 * If null, no move is currently happening.
 */
const movedWhich = ref<Which | null>(null)

const startMove = (e: MouseEvent, which: Which) => {
  movedWhich.value = which
  movedInnerOffset.value = { x: e.offsetX - props.shape.x, y: e.offsetY - props.shape.y }

  const doMove = (moveE: MouseEvent) => {
    if (
      Math.abs(props.shape.x - moveE.offsetX) < MOVE_THRESHOLD &&
      Math.abs(props.shape.y - moveE.offsetY) < MOVE_THRESHOLD
    ) {
      return
    }
    emit('update', getUpdatedShape(which, moveE.offsetX, moveE.offsetY))
  }

  const endMove = () => {
    movedWhich.value = null
    document.removeEventListener('mousemove', doMove)
    document.removeEventListener('mouseup', endMove)
  }

  document.addEventListener('mouseup', endMove)
  document.addEventListener('mousemove', doMove)
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
    @mousedown="startMove($event, p.which)"
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
    @click="emit('click')"
    @mousedown="startMove($event, 'whole')"
  />
</template>
