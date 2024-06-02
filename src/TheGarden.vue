<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { v4 as uuidV4 } from 'uuid';

import GardenBed from './GardenBed.vue';
import GardenFeature from './GardenFeature.vue';
import {
  useGardenStore,
  type GardenBed as GardenBedType,
  type GardenThing,
} from './useGardenStore';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';

onMounted(() => {
  document.addEventListener('keydown', (e): void => {
    if (e.key === 'Delete' && garden.selectedId !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      garden.deleteFeature(garden.selectedId);
    }
  });
});

const updateBed = (bed: GardenBedType) => {
  const index = garden.gardenBeds.findIndex((b) => b.id === bed.id);
  garden.gardenBeds[index] = bed;
  garden.selectedId = undefined;
  garden.hoveredId = undefined;
};

const garden = useGardenStore();
const camera = useCameraStore();
const scene = useSceneStore();

// bed drawing

const addNewBed = (bed: GardenBedType) => {
  garden.gardenBeds.push(bed);
  garden.newBed = undefined;
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
  if (!scene.isDrawing || !garden.plant) {
    return;
  }

  return getNewShape(garden.plant.id);
});

watch(
  () => scene.isDrawing,
  (isDrawing) => {
    if (!isDrawing && garden.plant) {
      garden.gardenThings.push(getNewShape(garden.plant.id));
    }
  },
);
</script>
<template>
  <GardenBed
    v-for="bed in garden.gardenBeds"
    :key="bed.id"
    :selected="garden.selectedId === bed.id"
    :hovered="garden.hoveredId === bed.id"
    :bed="bed"
    :mouse-x="(scene.x + camera.x) / camera.scale"
    :mouse-y="(scene.y + camera.y) / camera.scale"
    @cancel="garden.deactivateAll"
    @click.exact="garden.selectedId = bed.id"
    @click.shift="garden.removeBed(bed.id)"
    @mouseenter="garden.hoveredId = bed.id"
    @mouseleave="garden.hoveredId = undefined"
    @update="updateBed"
  />
  <GardenFeature
    v-for="({ thing, plant }, index) in garden.gardenThingsWithPlants"
    :key="thing.id"
    :thing="thing"
    :plant="plant"
    :active="garden.selectedId === thing.id || garden.hoveredId === thing.id"
    :scale="camera.scale"
    @delete="garden.deleteFeature(thing.id)"
    @click="garden.selectedId = thing.id"
    @update="($event) => (garden.gardenThings[index] = $event)"
  />

  <GardenBed
    v-if="garden.newBed"
    :mouse-x="(scene.x + camera.x) / camera.scale"
    :mouse-y="(scene.y + camera.y) / camera.scale"
    :bed="garden.newBed"
    hovered
    selected
    @update="addNewBed"
  />

  <GardenFeature
    v-if="newShape && garden.plant"
    :thing="newShape"
    :plant="garden.plant"
    active
    :scale="camera.scale"
  />
</template>
