<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps<{
  line: { x1: number; y1: number; x2: number; y2: number }
  length: number
}>()

defineEmits<{
  (e: 'start-move-scale-start' | 'start-move-scale-end', event: MouseEvent): void
}>()

const centroid = computed(() => {
  const { x1, y1, x2, y2 } = props.line
  const x = Math.abs((x1 + x2) / 2)
  const y = Math.abs((y1 + y2) / 2)

  return { x, y }
})
</script>
<template>
  <line stroke="red" :x1="line.x1" :x2="line.x2" :y1="line.y1" :y2="line.y2" />

  <circle
    v-if="line"
    :cx="line.x1"
    :cy="line.y1"
    r="5"
    class="hover:[r:8]"
    fill="red"
    @mousedown.stop="($event) => $emit('start-move-scale-start', $event)"
  />

  <circle
    :cx="line.x2"
    :cy="line.y2"
    r="5"
    class="hover:[r:8]"
    fill="red"
    @mousedown.stop="($event) => $emit('start-move-scale-end', $event)"
  />

  <text v-if="centroid" :x="centroid.x" :y="centroid.y" fill="red">
    {{ length }}
  </text>
</template>
