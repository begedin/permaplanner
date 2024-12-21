<script lang="ts" setup>
import { computed } from 'vue';

import { useGardenStore } from './useGardenStore';
import PlantIcon from './PlantIcon.vue';

const garden = useGardenStore();

const props = defineProps<{
  id: string;
}>();

const guildWithPlants = computed(() =>
  garden.guildsWithPlants.find(({ guild }) => guild.id === props.id),
);

const setName = (e: Event) => {
  if (!guildWithPlants.value) {
    return;
  }
  guildWithPlants.value.guild.name = (e.target as HTMLInputElement)?.value || '';
};

const addPlant = (plantId: string) => {
  guildWithPlants.value?.guild.plantIds.push(plantId);
};
const removePlant = (index: number) => guildWithPlants.value?.guild.plantIds.splice(index, 1);
</script>
<template>
  <button
    v-if="guildWithPlants"
    class="flex flex-col gap-1 items-start justify-start hover:bg-emerald-300 transition-colors p-2 rounded text-slate-600"
    :class="garden.selectedId === id ? 'bg-emerald-500' : 'bg-emerald-200'"
    @click.exact="garden.selectedId = id"
    @click.shift="garden.deleteFeature(id)"
    @mouseenter="garden.hoveredId = id"
    @mouseleave="garden.hoveredId = undefined"
  >
    <input
      class="appearance-none bg-transparent border-none focus:outline-none text-slate-600 w-full truncate"
      :value="guildWithPlants.guild.name"
      @input="setName"
    />
    <div
      class="flex flex-row flex-wrap gap-1"
      data-testid="bed-plants"
    >
      <h3 class="w-full text-left">Plants</h3>
      <div
        v-for="(plant, index) in guildWithPlants.plants"
        :key="plant.id"
        class="group grid grid-cols-1 grid-rows-1 p-1 bg-sky-200 h-7 w-7 rounded-md drop-shadow place-items-center"
      >
        <PlantIcon
          :title="plant.name"
          class="h-6 w-6 col-start-1 col-end-1 row-start-1 row-end-1"
          :plant="plant"
        />

        <button
          title="Remove plant from bed"
          class="hidden group-hover:grid text-sky-900 h-full w-full col-start-1 col-end-1 row-start-1 row-end-1 content-center"
          @click="removePlant(index)"
        >
          x
        </button>
      </div>
    </div>

    <div
      v-if="garden.selectedId === id"
      class="flex flex-col gap-1"
    >
      <h3 class="w-full">Add a plant to this bed</h3>
      <button
        v-for="plant in garden.plants"
        :key="plant.id"
        class="flex flex-row gap-1 items-center bg-sky-50 rounded-md p-1"
        @click="addPlant(plant.id)"
      >
        <PlantIcon
          class="h-6 w-6"
          :plant="plant"
          :title="plant.name"
        />
        <div>{{ plant.name }}</div>
      </button>
    </div>
  </button>
</template>
