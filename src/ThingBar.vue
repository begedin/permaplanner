<script lang="ts" setup>
import PlantIcon from './PlantIcon.vue';
import ThingBarBed from './ThingBarBed.vue';
import { useGardenStore, type GardenThing } from './useGardenStore';

const garden = useGardenStore();

const setName = (thing: GardenThing, event: Event) => {
  const target = event.target as HTMLInputElement;
  thing.name = target.value;
};
</script>
<template>
  <div
    class="p-2 flex flex-col gap-1 bg-emerald-50"
    data-thing-bar
  >
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
          class="h-8 w-8"
          :plant="plant"
        />
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
    <ThingBarBed
      v-for="bed in garden.gardenBeds"
      :id="bed.id"
      :key="bed.id"
    />
  </div>
</template>
