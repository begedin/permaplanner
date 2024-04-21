<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue'
import type { GardenBed } from './useStore'

const props = defineProps<{
  bed: GardenBed
  hovered: boolean
  selected: boolean
  scale: number
  mouseX: number
  mouseY: number
}>()

const emit = defineEmits<{
  (e: 'update', bed: GardenBed): void
  (e: 'cancel'): void
}>()

const less = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  center: { x: number; y: number },
): boolean => {
  if (a.x - center.x >= 0 && b.x - center.x < 0) {
    return true
  }
  if (a.x - center.x < 0 && b.x - center.x >= 0) {
    return false
  }
  if (a.x - center.x == 0 && b.x - center.x == 0) {
    if (a.y - center.y >= 0 || b.y - center.y >= 0) {
      return a.y > b.y
    }
    return b.y > a.y
  }

  // compute the cross product of vectors (center -> a) x (center -> b)
  const det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y)
  if (det < 0) {
    return true
  }
  if (det > 0) {
    return false
  }

  // points a and b are on the same line from the center
  // check which point is closer to the center
  const d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y)
  const d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y)
  return d1 > d2
}

const getCentroid = (points: { x: number; y: number }[]): { x: number; y: number } => {
  const x = points.reduce((acc, p) => acc + p.x, 0) / points.length
  const y = points.reduce((acc, p) => acc + p.y, 0) / points.length
  return { x, y }
}

const points = ref<{ x: number; y: number }[]>([])
watch(
  () => props.bed.points,
  (originalPoints) => {
    points.value = originalPoints.map((point) => ({ x: point.x, y: point.y }))
  },
  { immediate: true },
)

let controller = new AbortController()

const activePoint = ref<{ x: number; y: number }>()

const sortedPoints = computed(() => {
  const allPoints = activePoint.value ? [activePoint.value, ...points.value] : [...points.value]
  const centroid = getCentroid(allPoints)
  allPoints.sort((a, b) => (less(a, b, centroid) ? -1 : 1))
  return allPoints
})

watch(
  () => props.selected,
  (selected) => {
    console.log('selected', selected)
    if (selected) {
      controller = new AbortController()

      document.addEventListener(
        'mousemove',
        () => {
          if (!activePoint.value && !hoveredPoint.value) {
            activePoint.value = { x: props.mouseX / props.scale, y: props.mouseY / props.scale }
          }
          if (!activePoint.value) {
            return
          }

          activePoint.value.x = props.mouseX / props.scale
          activePoint.value.y = props.mouseY / props.scale
        },
        { signal: controller.signal },
      )

      document.addEventListener(
        'click',
        () => {
          if (!activePoint.value) {
            return
          }
          points.value.push({ x: activePoint.value.x, y: activePoint.value.y })
        },
        { signal: controller.signal },
      )

      document.addEventListener('keydown', (e: KeyboardEvent) => {
        console.log('keypress', e.key)
        if (e.key === 'Enter') {
          activePoint.value = undefined
          emit('update', { ...props.bed, points: points.value })
          controller.abort()
        }

        if (e.key === 'Escape') {
          console.log('Escape')
          controller.abort()
          activePoint.value = undefined
          points.value = props.bed.points.map((point) => ({ x: point.x, y: point.y }))
          emit('cancel')
        }
      })
    } else {
      controller.abort()
    }
  },
  { immediate: true },
)

const polygonPoints = computed(() =>
  sortedPoints.value.map((point) => `${point.x},${point.y}`).join(' '),
)

const hoveredPoint = ref<{ x: number; y: number }>()

const setHoveredPoint = (point: { x: number; y: number }) => {
  hoveredPoint.value = point
  activePoint.value = undefined
}

const unsetHoveredPoint = () => {
  hoveredPoint.value = undefined
  activePoint.value = { x: props.mouseX / props.scale, y: props.mouseY / props.scale }
}

const activatePoint = (point: { x: number; y: number }) => {
  points.value = points.value.filter((p) => p !== point)
  activePoint.value = point
  hoveredPoint.value = undefined
}
</script>
<template>
  <polygon v-bind="$attrs" :points="polygonPoints" fill="brown" opacity="0.5" />
  <template v-if="hovered || selected" v-for="point in sortedPoints">
    <circle
      v-if="point !== activePoint"
      :cx="point.x"
      :cy="point.y"
      :r="(point === hoveredPoint ? 6 : 3) / scale"
      :fill="point === activePoint ? 'blue' : 'pink'"
      @mouseenter="setHoveredPoint(point)"
      @mouseleave="unsetHoveredPoint"
      @click.stop="activatePoint(point)"
    />
    <circle
      v-else
      :cx="point.x"
      :cy="point.y"
      :r="(point === hoveredPoint ? 5 : 3) / scale"
      :fill="point === activePoint ? 'blue' : 'pink'"
      class="pointer-events-none"
    />
  </template>
</template>
