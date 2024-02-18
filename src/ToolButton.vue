<script lang="ts" setup>
import type { HexColor } from './colors'

defineProps<{
  tool: 'circle' | 'rectangle' | 'line'
  color: HexColor
  active: boolean
}>()
</script>
<template>
  <button class="p-1 rounded hover:bg-sky-50 transition-colors" :class="active && 'bg-emerald-50'">
    <svg height="30" width="30" class="h-full" w-full>
      <circle
        v-if="tool === 'circle'"
        cx="50%"
        cy="50%"
        r="46%"
        :stroke="color"
        stroke-width="3"
        fill="transparent"
      />
      <rect
        v-if="tool === 'rectangle'"
        x="2"
        y="2"
        width="25"
        height="25"
        :stroke="color"
        stroke-width="3"
        fill="transparent"
      />
      <path
        v-if="tool === 'line'"
        d="M 2 28 L 28 2"
        :stroke="color"
        stroke-width="3"
        fill="transparent"
      />
    </svg>
  </button>
</template>
