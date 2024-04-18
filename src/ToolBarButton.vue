<script lang="ts" setup>
import type { Plant } from './useStore'

defineProps<{
  plant: Plant
  active: boolean
}>()
</script>
<template>
  <button
    :title="plant.name"
    class="py-1 px-2 rounded hover:bg-sky-100 transition-colors flex flex-row gap-2 items-center text-slate-600"
    :class="active && 'bg-sky-200'"
  >
    <svg width="30" height="30" viewBox="0 0 200 200">
      <use :xlink:href="'#' + plant.bgId" :width="200" :height="200" />
      <use :xlink:href="'#' + plant.layerId" :width="200" :height="200" />
    </svg>
    {{ plant.name }}
  </button>
</template>
