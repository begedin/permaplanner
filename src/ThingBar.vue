<script lang="ts" setup>
import PlantIcon from './PlantIcon.vue'
import { useStore, type GardenThing } from './useStore'
import { useStorage } from '@vueuse/core'

const store = useStore()

const setName = (thing: GardenThing, event: Event) => {
  const target = event.target as HTMLInputElement
  thing.name = target.value
}
const mode = useStorage<'plant' | 'icon'>('thingBarMode', 'icon')
</script>
<template>
  <div class="p-2 flex flex-col gap-1">
    <div class="grid grid-cols-2 gap-1 pb-2">
      <button
        @click="mode = 'plant'"
        class="hover:bg-emerald-200 p-1 text-slate-600 rounded-md"
        :class="mode === 'plant' ? 'bg-emerald-300' : 'bg-emerald-100'"
      >
        Plant
      </button>
      <button
        @click="mode = 'icon'"
        class="hover:bg-emerald-200 p-1 text-slate-600 rounded-md"
        :class="mode === 'icon' ? 'bg-emerald-300' : 'bg-emerald-100'"
      >
        Icon
      </button>
    </div>
    <label>Plants</label>
    <button
      class="flex flex-row gap-1 items-center justify-start hover:bg-emerald-300 transition-colors p-2 rounded text-slate-600"
      :class="store.selectedId === thing.id ? 'bg-emerald-500' : 'bg-emerald-200'"
      v-for="{ thing, plant } in store.gardenThingsWithPlants"
      @click="store.selectedId = thing.id"
      @click.shift="store.deleteFeature(thing.id)"
      @mouseenter="store.hoveredId = thing.id"
      @mouseleave="store.hoveredId = undefined"
    >
      <div class="bg-sky-200 p-1 rounded-md">
        <PlantIcon v-if="mode === 'plant'" class="h-8 w-8" :plant="plant" />
        <svg v-else class="h-8 w-8">
          <use
            :xlink:href="'#' + plant.features[0]?.feature || plant.background"
            x="0"
            y="0"
            width="100%"
            height="100%"
          />
        </svg>
      </div>

      <input
        v-if="store.selectedId === thing.id"
        :value="thing.name || plant.name"
        @input="($event) => setName(thing, $event)"
        class="bg-transparent appearance-none focus:outline-none border-none text-slate-600 w-full truncate"
      />
      <span v-else>{{ thing.name || plant.name }}</span>
    </button>
    <label>Beds</label>
    <button
      class="flex flex-row gap-1 items-center justify-start hover:bg-emerald-300 transition-colors p-2 rounded text-slate-600"
      :class="store.selectedId === bed.id ? 'bg-emerald-500' : 'bg-emerald-200'"
      v-for="(bed, index) in store.gardenBeds"
      :key="bed.id"
      @click="store.selectedId = bed.id"
      @click.shift="store.deleteFeature(bed.id)"
      @mouseenter="store.hoveredId = bed.id"
      @mouseleave="store.hoveredId = undefined"
    >
      Bed {{ index }}
    </button>
  </div>
</template>
