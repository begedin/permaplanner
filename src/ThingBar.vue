<script lang="ts" setup>
import PlantIcon from './PlantIcon.vue'
import { useStore, type GardenThing } from './useStore'

const store = useStore()

const setName = (thing: GardenThing, event: Event) => {
  const target = event.target as HTMLInputElement
  thing.name = target.value
}
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
      <input
        :value="thing.name || plant.name"
        @input="($event) => setName(thing, $event)"
        class="bg-transparent appearance-none focus:outline-none border-none text-slate-600 w-full truncate"
      />
    </button>
  </div>
</template>
