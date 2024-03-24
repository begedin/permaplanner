<script lang="ts" setup>
import type { Tool } from './data'

defineProps<{
  toolKind: Tool['kind']
  toolName: string
  active: boolean
}>()
</script>
<template>
  <button
    :title="toolName"
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
      <use :xlink:href="`#${toolKind}`" width="25" height="25" />
    </svg>
  </button>
</template>
