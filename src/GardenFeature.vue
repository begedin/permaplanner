<script lang="ts" setup>
import { computed, ref } from 'vue'
import type { GardenThing } from './types'

const props = defineProps<{ shape: GardenThing; active?: boolean }>()
const emit = defineEmits<{
  (e: 'click' | 'delete'): void
  (e: 'update', shape: GardenThing): void
}>()

type Which = 'topLeft' | 'bottomRight' | 'topRight' | 'bottomLeft'

const points = computed<{ which: Which; x: number; y: number }[]>(() => [
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

  return shape
}

const movedWhich = ref<Which | null>(null)
const startMove = (e: MouseEvent, which: Which) => {
  movedWhich.value = which

  const doMove = (moveE: MouseEvent) => {
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
    v-if="shape.kind === 'blueberry'"
    xlink:href="#blueberry"
    :x="shape.x"
    :y="shape.y"
    :width="shape.width"
    :height="shape.height"
    @click="emit('click')"
  />
</template>
