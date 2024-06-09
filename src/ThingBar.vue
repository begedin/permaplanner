<script lang="ts" setup>
import PlantIcon from './PlantIcon.vue';
import { useGardenStore, type GardenThing } from './useGardenStore';
import { useStorage } from '@vueuse/core';

const garden = useGardenStore();

const setName = (thing: GardenThing, event: Event) => {
  const target = event.target as HTMLInputElement;
  thing.name = target.value;
};
const mode = useStorage<'plant' | 'icon'>('thingBarMode', 'icon');
</script>
<template>
  <div
    class="p-2 flex flex-col gap-1"
    data-thing-bar
  >
    <div class="grid grid-cols-2 gap-1 pb-2">
      <button
        class="hover:bg-emerald-200 p-1 text-slate-600 rounded-md"
        :class="mode === 'plant' ? 'bg-emerald-300' : 'bg-emerald-100'"
        @click="mode = 'plant'"
      >
        Plant
      </button>
      <button
        class="hover:bg-emerald-200 p-1 text-slate-600 rounded-md"
        :class="mode === 'icon' ? 'bg-emerald-300' : 'bg-emerald-100'"
        @click="mode = 'icon'"
      >
        Icon
      </button>
    </div>
    <label>Plants</label>
    <button
      v-for="{ thing, plant } in garden.gardenThingsWithPlants"
      :key="thing.id"
      class="flex flex-row gap-1 items-center justify-start hover:bg-emerald-300 transition-colors p-2 rounded text-slate-600"
      :class="garden.selectedId === thing.id ? 'bg-emerald-500' : 'bg-emerald-200'"
      @click.exact="garden.selectedId = thing.id"
      @click.shift="garden.deleteFeature(thing.id)"
      @mouseenter="garden.hoveredId = thing.id"
      @mouseleave="garden.hoveredId = undefined"
    >
      <div class="bg-sky-200 p-1 rounded-md">
        <PlantIcon
          v-if="mode === 'plant'"
          class="h-8 w-8"
          :plant="plant"
        />
        <svg
          v-else
          class="h-8 w-8"
        >
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
        v-if="garden.selectedId === thing.id"
        :value="thing.name || plant.name"
        class="bg-transparent appearance-none focus:outline-none border-none text-slate-600 w-full truncate"
        @input="($event) => setName(thing, $event)"
      />
      <span v-else>{{ thing.name || plant.name }}</span>
    </button>
    <label>Beds</label>
    <button
      v-for="(bed, index) in garden.gardenBeds"
      :key="bed.id"
      class="flex flex-row gap-1 items-center justify-start hover:bg-emerald-300 transition-colors p-2 rounded text-slate-600"
      :class="garden.selectedId === bed.id ? 'bg-emerald-500' : 'bg-emerald-200'"
      @click.exact="garden.selectedId = bed.id"
      @click.shift="garden.deleteFeature(bed.id)"
      @mouseenter="garden.hoveredId = bed.id"
      @mouseleave="garden.hoveredId = undefined"
    >
      Bed {{ index }}
    </button>
  </div>
</template>
