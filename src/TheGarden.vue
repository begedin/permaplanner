<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { v4 as uuidV4 } from 'uuid';

import GardenBed from './GardenBed.vue';
import GardenFeature from './GardenFeature.vue';
import { useStore, type GardenBed as GardenBedType, type GardenThing } from './useStore';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';

onMounted(() => {
  document.addEventListener('keydown', (e): void => {
    if (e.key === 'Delete' && store.selectedId !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      store.deleteFeature(store.selectedId);
    }
  });
});

const updateBed = (bed: GardenBedType) => {
  const index = store.gardenBeds.findIndex((b) => b.id === bed.id);
  store.gardenBeds[index] = bed;
  store.selectedId = undefined;
  store.hoveredId = undefined;
};

const store = useStore();
const camera = useCameraStore();
const scene = useSceneStore();

// bed drawing

const addNewBed = (bed: GardenBedType) => {
  store.gardenBeds.push(bed);
  store.newBed = undefined;
};

// feature drawing

const getNewShape = (plantId: string) => {
  const x = Math.min(scene.box.x, scene.box.x + scene.box.width);
  const y = Math.min(scene.box.y, scene.box.y + scene.box.height);
  const width = Math.abs(scene.box.width);
  const height = Math.abs(scene.box.height);

  return {
    id: uuidV4(),
    type: 'plant',
    plantId,
    x: (x + camera.x) / camera.scale,
    y: (y + camera.y) / camera.scale,
    width: width / camera.scale,
    height: height / camera.scale,
  };
};

const newShape = computed<GardenThing | void>(() => {
  if (!scene.isDrawing || !store.plant) {
    return;
  }

  return getNewShape(store.plant.id);
});

watch(
  () => scene.isDrawing,
  (isDrawing) => {
    if (!isDrawing && store.plant) {
      store.gardenThings.push(getNewShape(store.plant.id));
    }
    console.log('not applicable', isDrawing, store.plant);
  },
);
</script>
<template>
  <GardenBed
    v-for="bed in store.gardenBeds"
    :key="bed.id"
    :selected="store.selectedId === bed.id"
    :hovered="store.hoveredId === bed.id"
    :bed="bed"
    :mouse-x="(scene.x + camera.x) / camera.scale"
    :mouse-y="(scene.y + camera.y) / camera.scale"
    @cancel="store.deactivateAll"
    @click.exact="store.selectedId = bed.id"
    @click.shift="store.removeBed(bed.id)"
    @mouseenter="store.hoveredId = bed.id"
    @mouseleave="store.hoveredId = undefined"
    @update="updateBed"
  />
  <GardenFeature
    v-for="({ thing, plant }, index) in store.gardenThingsWithPlants"
    :key="thing.id"
    :thing="thing"
    :plant="plant"
    :active="store.selectedId === thing.id || store.hoveredId === thing.id"
    :scale="camera.scale"
    @delete="store.deleteFeature(thing.id)"
    @click="store.selectedId = thing.id"
    @update="($event) => (store.gardenThings[index] = $event)"
  />

  <GardenBed
    v-if="store.newBed"
    :mouse-x="(scene.x + camera.x) / camera.scale"
    :mouse-y="(scene.y + camera.y) / camera.scale"
    :bed="store.newBed"
    hovered
    selected
    @update="addNewBed"
  />

  <GardenFeature
    v-if="newShape && store.plant"
    :thing="newShape"
    :plant="store.plant"
    active
    :scale="camera.scale"
  />
</template>
