<script lang="ts" setup>
import type { Plant } from './useStore'
import PlantIcon from './PlantIcon.vue'

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
    <PlantIcon class="w-8 h-8" :plant="plant" />
    {{ plant.name }}
  </button>
</template>
