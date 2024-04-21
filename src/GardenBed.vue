<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  bed: { id: string; points: { x: number; y: number }[] }
  active: boolean
  scale: number
}>()
const polygonPoints = computed(() =>
  props.bed.points.map((point) => `${point.x},${point.y}`).join(' '),
)
</script>
<template>
  <polygon v-bind="$attrs" :points="polygonPoints" fill="brown" opacity="0.5" />
  <circle
    v-if="active"
    v-for="point in bed.points"
    :cx="point.x"
    :cy="point.y"
    :r="4 / scale"
    fill="pink"
  />
</template>
