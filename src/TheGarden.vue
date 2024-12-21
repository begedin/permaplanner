<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { v4 as uuidV4 } from 'uuid';

import GardenGuild from './GardenGuild.vue';
import GardenFeature from './GardenFeature.vue';
import { useGardenStore, type Guild, type GardenThing } from './useGardenStore';
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

const updateGuild = (guild: Guild) => {
  const index = garden.guilds.findIndex((g) => g.id === guild.id);
  garden.guilds[index] = guild;
  garden.selectedId = undefined;
  garden.hoveredId = undefined;
};

const garden = useGardenStore();
const camera = useCameraStore();
const scene = useSceneStore();
const mapScale = useMapScaleStore();

// bed drawing

const addNewGuild = (guild: Guild) => {
  garden.guilds.push(guild);
  garden.newGuild = undefined;
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
  <GardenGuild
    v-for="guild in garden.guilds"
    :key="guild.id"
    :selected="garden.selectedId === guild.id"
    :hovered="garden.hoveredId === guild.id"
    :guild="guild"
    :unit-length-px="mapScale.unitLengthPx"
    @cancel="garden.deactivateAll"
    @click.exact="garden.editGuild(guild.id)"
    @click.shift="garden.removeGuild(guild.id)"
    @mouseenter="garden.hoveredId = guild.id"
    @mouseleave="garden.hoveredId = undefined"
    @update="updateGuild"
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

  <GardenGuild
    v-if="garden.newGuild"
    :guild="garden.newGuild"
    :unit-length-px="mapScale.unitLengthPx"
    hovered
    selected
    @update="addNewGuild"
    @cancel="garden.newGuild = undefined"
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
