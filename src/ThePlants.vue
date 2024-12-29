<script setup lang="ts">
import { computed, ref } from 'vue';
import { v4 as uuidV4 } from 'uuid';
import { useGardenStore, type Plant, type Feature } from './useGardenStore';
import PlantCanvas from './PlantCanvas.vue';
import PlantFeatures from './PlantFeatures.vue';
import PlantBases from './PlantBases.vue';
import PlantFunctions from './PlantFunctions.vue';
import PlantIcon from './PlantIcon.vue';

const garden = useGardenStore();

const save = () => {
  const index = garden.plants.findIndex((p) => p.id === plantInEditing.value.id);
  if (index === -1) {
    garden.plants.push(plantInEditing.value);
  } else {
    garden.plants.splice(index, 1, plantInEditing.value);
  }
};

const edit = (plant: Plant) => {
  plantInEditing.value = plant;
};

const newPlant = () => {
  plantInEditing.value = {
    id: uuidV4(),
    background: 'bg_1',
    features: [],
    name: '',
    functions: [],
    layers: [],
  };
};

const remove = (plant: Plant) => {
  garden.plants = garden.plants.filter((p) => p.id !== plant.id);
};

const isNew = computed(
  () => garden.plants.findIndex((p) => p.id === plantInEditing.value.id) === -1,
);

const currentFeature = ref<Feature>('apple');

const plantInEditing = ref<Plant>({
  id: uuidV4(),
  background: 'bg_1',
  features: [],
  name: '',
  functions: [],
  layers: [],
});
</script>
<template>
  <div class="bg-white p-4 grid grid-flow-col items-start gap-8 rounded-md">
    <div class="flex flex-col gap-1">
      <div
        v-for="plant in garden.plants"
        :key="plant.name"
        role="button"
        class="flex flex-row items-center gap-1 bg-slate-200 rounded-md p-1 hover:bg-slate-300 text-slate-900"
        :class="{ 'bg-slate-400': plant.id === plantInEditing.id }"
        :title="plant.name"
        :aria-label="plant.name"
        @click="edit(plant)"
      >
        <PlantIcon
          class="w-7 h-7"
          :plant="plant"
        />
        <span class="w-20 truncate text-left">{{ plant.name }}</span>
        <button
          class="bg-red-200 hover:bg-red-300 p-1 rounded-md text-xs"
          @click.self="remove(plant)"
        >
          🗑️
        </button>
      </div>
      <button
        class="flex flex-row items-center gap-1 bg-slate-200 rounded-md p-1 hover:bg-slate-300 text-slate-900"
        :class="{ 'bg-slate-400': isNew }"
        @click="newPlant"
      >
        <svg
          class="w-7 h-7"
          height="20"
          width="20"
          viewBox="0 0 20 20"
          data-plant-creator-canvas
        >
          <use
            xlink:href="#bg_1"
            width="100%"
            height="100%"
          />
        </svg>
        <span class="w-20 truncate text-left">{{
          isNew ? plantInEditing.name || 'New' : 'New'
        }}</span>
      </button>
    </div>
    <div>
      <PlantCanvas
        v-model:plant="plantInEditing"
        :current-feature="currentFeature"
        :scale="1"
      />
    </div>
    <div class="flex flex-col gap-2 p-2">
      <PlantBases v-model:value="plantInEditing.background" />
      <PlantFeatures v-model:value="currentFeature" />
      <PlantFunctions v-model:value="plantInEditing.functions" />
      <label class="flex flex-col gap-1">
        <span class="text-slate-800">Name</span>
        <input
          v-model="plantInEditing.name"
          class="p-1 border border-slate-300 rounded-md text-slate-800"
        />
      </label>
      <button
        class="px-2 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600"
        @click="save"
      >
        {{ isNew ? 'Create' : 'Save' }}
      </button>
    </div>
  </div>
</template>
