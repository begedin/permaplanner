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
import { useMapScaleStore } from './useMapScaleStore';

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
const mapScale = useMapScaleStore();

// bed drawing

const addNewBed = (bed: GardenBedType) => {
  garden.gardenBeds.push(bed);
  garden.newBed = undefined;
};

// feature drawing

const getNewShape = (plantId: string) => {
  const x = Math.min(scene.cameraBox.x, scene.cameraBox.x + scene.cameraBox.width);
  const y = Math.min(scene.cameraBox.y, scene.cameraBox.y + scene.cameraBox.height);
  const width = Math.abs(scene.cameraBox.width);
  const height = Math.abs(scene.cameraBox.height);

  return { id: uuidV4(), type: 'plant', plantId, x, y, width, height };
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
    :unit-length-px="mapScale.unitLengthPx"
    @cancel="garden.deactivateAll"
    @click.exact="garden.editBed(bed.id)"
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
    :unit-length-px="mapScale.unitLengthPx"
    @delete="garden.deleteFeature(thing.id)"
    @click="garden.selectedId = thing.id"
    @update="($event) => (garden.gardenThings[index] = $event)"
    @mouseenter="garden.hoveredId = thing.id"
    @mouseleave="garden.hoveredId = undefined"
  />

  <GardenBed
    v-if="garden.newBed"
    :bed="garden.newBed"
    :unit-length-px="mapScale.unitLengthPx"
    hovered
    selected
    @update="addNewBed"
    @cancel="garden.newBed = undefined"
  />

  <GardenFeature
    v-if="newShape && garden.plant"
    :thing="newShape"
    :plant="garden.plant"
    active
    :scale="camera.scale"
    :unit-length-px="mapScale.unitLengthPx"
  />
</template>
