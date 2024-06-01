<script setup lang="ts">
import { onMounted } from 'vue';
import GardenBed from './GardenBed.vue';
import GardenFeature from './GardenFeature.vue';
import { useStore, type GardenBed as GardenBedType } from './useStore';
import { useCameraStore } from './useCameraStore';
import { useSceneMousePositionStore } from './useSceneMousePositionStore';

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
const mouse = useSceneMousePositionStore();
</script>
<template>
  <GardenBed
    v-for="bed in store.gardenBeds"
    :key="bed.id"
    :selected="store.selectedId === bed.id"
    :hovered="store.hoveredId === bed.id"
    :bed="bed"
    :scale="camera.scale"
    :mouse-x="mouse.x"
    :mouse-y="mouse.y"
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
</template>
