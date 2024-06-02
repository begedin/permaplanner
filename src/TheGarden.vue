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

const getBoundingBox = (bed: GardenBedType) => {
  const [minX, maxX, minY, maxY] = bed.points.reduce(
    (acc, point) => {
      acc[0] = Math.min(acc[0], point.x);
      acc[1] = Math.max(acc[1], point.x);
      acc[2] = Math.min(acc[2], point.y);
      acc[3] = Math.max(acc[3], point.y);
      return acc;
    },
    [Infinity, -Infinity, Infinity, -Infinity],
  );

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

const bedsWithBoundingBoxes = computed(() =>
  garden.gardenBeds.map((bed) => ({
    bed,
    box: getBoundingBox(bed),
  })),
);
</script>

<template>
  <template
    v-for="{ bed, box } in bedsWithBoundingBoxes"
    :key="bed.id"
  >
    <GardenBed
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
    <text
      v-if="garden.selectedId === bed.id || garden.hoveredId === bed.id"
      :x="box.x"
      :y="box.y + box.height + 14"
      fill="red"
    >
      {{
        `${(box.width / mapScale.unitLengthPx).toFixed(2)}x${(
          box.height / mapScale.unitLengthPx
        ).toFixed(2)}`
      }}
    </text>
  </template>
  <template
    v-for="({ thing, plant }, index) in garden.gardenThingsWithPlants"
    :key="thing.id"
  >
    <GardenFeature
      :thing="thing"
      :plant="plant"
      :active="garden.selectedId === thing.id || garden.hoveredId === thing.id"
      :scale="camera.scale"
      @delete="garden.deleteFeature(thing.id)"
      @click="garden.selectedId = thing.id"
      @update="($event) => (garden.gardenThings[index] = $event)"
      @mouseenter="garden.hoveredId = thing.id"
      @mouseleave="garden.hoveredId = undefined"
    />
    <text
      v-if="garden.selectedId === thing.id || garden.hoveredId === thing.id"
      :x="thing.x"
      :y="thing.y + thing.height + 14"
      fill="red"
    >
      {{
        `${(thing.width / mapScale.unitLengthPx).toFixed(2)}x${(
          thing.height / mapScale.unitLengthPx
        ).toFixed(2)}`
      }}
    </text>
  </template>

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
