<script lang="ts" setup>
import { computed } from 'vue'
import type { Tool } from './types'

const props = defineProps<{
  start: { x: number; y: number }
  end: { x: number; y: number }
  tool: Tool
}>()

const bbox = computed(() => ({
  x: Math.min(props.start.x, props.end.x),
  y: Math.min(props.start.y, props.end.y),
  width: Math.abs(props.start.x - props.end.x),
  height: Math.abs(props.start.y - props.end.y)
}))
</script>
<template>
  <rect
    :x="bbox.x"
    :y="bbox.y"
    :width="bbox.width"
    :height="bbox.height"
    fill="transparent"
    stroke-width="1"
    stroke="fuchsia"
  />
</template>
