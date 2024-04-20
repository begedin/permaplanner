<script lang="ts" setup>
import PlantIcon from './PlantIcon.vue'
import { useStore } from './useStore'

const store = useStore()
</script>
<template>
  <div class="p-2 flex flex-col gap-1">
    <button
      class="flex flex-row gap-1 items-center justify-start hover:bg-emerald-100 transition-colors py-1 px-2 rounded text-slate-600"
      :class="store.selectedId === thing.id ? 'bg-emerald-200' : 'bg-emerald-50'"
      v-for="{ thing, plant } in store.gardenThingsWithPlants"
      @click="store.selectedId = thing.id"
      @click.shift="store.deleteFeature(thing.id)"
      @mouseenter="store.hoveredId = thing.id"
      @mouseleave="store.hoveredId = undefined"
    >
      <PlantIcon class="h-8 w-8" :plant="plant" />
      {{ plant.name }}
    </button>
  </div>
</template>
