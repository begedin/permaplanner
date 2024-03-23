<script lang="ts" setup>
import type { HexColor } from './colors'
import type { Tool } from './types'

defineProps<{
  toolKind: Tool['kind']
  toolName: string | null
  active: boolean
}>()
</script>
<template>
  <button
    title="toolName"
    class="p-1 rounded hover:bg-sky-50 transition-colors"
    :class="active && 'bg-sky-200'"
  >
    <svg
      height="30"
      width="30"
      class="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
    >
      <use v-if="toolKind === 'blueberry'" xlink:href="#blueberry" width="25" height="25" />
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">
        {{ toolName?.charAt(0) }}
      </text>
    </svg>
  </button>
</template>
