<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { v4 as uuidV4 } from 'uuid';

import GardenGuild from './GardenGuild.vue';
import GardenFeature from './GardenFeature.vue';
import { useGardenStore, type Guild, type GardenThing } from './useGardenStore';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';
import { useMapScaleStore } from './useMapScaleStore';
import { useScene } from './useScene';

import { useBackgroundImage } from './useBackgroundImage';
import { useCamera } from './useCamera';
import { useElementSize, useStorage } from '@vueuse/core';
import OnboardingText from './OnboardingText.vue';
import ThingBar from './ThingBar.vue';
import ToolBarButton from './ToolBarButton.vue';
import ToolSlider from './ToolSlider.vue';
import ReferenceLine from './ReferenceLine.vue';
import { useOnboardingStore } from './useOnboardingStore';

const {
  setupBackgroundImagePaste,
  teardownBackgroundImagePaste,
  imgWidth,
  imgHeight,
  imgSrc,
} = useBackgroundImage();
onMounted(() => setupBackgroundImagePaste());
onBeforeUnmount(() => teardownBackgroundImagePaste());

const container = ref<SVGElement>();

const { width: containerWidth, height: containerHeight } = useElementSize(container);

const { setupCamera, teardownCamera, fitToViewPort } = useCamera(
  container,
  computed(() => ({
    containerHeight: containerHeight.value,
    containerWidth: containerWidth.value,
    backgroundNaturalHeight: imgHeight.value,
    backgroundNaturalWidth: imgWidth.value,
  })),
);

const camera = useCameraStore();

onMounted(() => setupCamera());
onBeforeUnmount(() => teardownCamera());

const svgViewbox = computed(() => {
  const x = camera.x.toFixed(2);
  const y = camera.y.toFixed(2);
  const width = camera.width.toFixed(2);
  const height = camera.height.toFixed(2);
  return `${x} ${y} ${width} ${height}`;
});

const center = computed(() => {
  const x = camera.x / camera.scale;
  const y = camera.y / camera.scale;
  const width = containerWidth.value / camera.scale;
  const height = containerHeight.value / camera.scale;
  return { x: x + width / 2, y: y + height / 2 };
});

const bgImage = ref<SVGImageElement>();
const { width: imgElementWidth, height: imgElementHeight } = useElementSize(bgImage);

const bgImageLoaded = computed(
  () =>
    imgElementWidth.value === imgWidth.value &&
    imgElementHeight.value === imgHeight.value,
);

watch(bgImageLoaded, (loaded) => loaded && fitToViewPort(), { immediate: true });

const onboarding = useOnboardingStore();

const mapScale = useMapScaleStore();

const bgOpacity = useStorage('bgOpacity', 0.4);

useScene(container, bgImage);

const garden = useGardenStore();

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

const scene = useSceneStore();

// bed drawing

const addNewGuild = (guild: Guild) => {
  garden.guilds.push(guild);
  garden.newGuild = undefined;
};

// feature drawing

const getNewShape = (plantId: string) => {
  const x = Math.min(scene.worldBox.x, scene.worldBox.x + scene.worldBox.width);
  const y = Math.min(scene.worldBox.y, scene.worldBox.y + scene.worldBox.height);
  const width = Math.abs(scene.worldBox.width);
  const height = Math.abs(scene.worldBox.height);

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
      const shape = getNewShape(garden.plant.id);
      const overlappingGuild = garden.getOverlappingGuild(shape);

      if (!overlappingGuild) {
        return;
      }

      overlappingGuild.plants.push({ ...shape, x: shape.x, y: shape.y });
    }
  },
);
</script>

<template>
  <div class="grid grid-cols-[200px_1fr_250px] w-full h-full justify-stretch">
    <div class="p-2 flex flex-grow flex-col items-stretch gap-1 bg-gray-50">
      <ToolBarButton
        v-for="plant in garden.plants"
        :key="plant.id"
        :plant="plant"
        :active="garden.plant?.id === plant.id"
        :disabled="!bgImageLoaded"
        @click="garden.plant = plant"
      />
      <button
        class="p-1 rounded"
        :class="
          (garden.newGuild && ['bg-green-400 hover:bg-green-500']) || [
            'bg-green-200 hover:bg-green-300',
          ]
        "
        :disabled="!bgImageLoaded"
        @click.stop="garden.startDrawGuild"
      >
        Guild
      </button>
      <ToolSlider
        v-model:value="mapScale.linePhysicalLength"
        label="Map scale"
        :min="1"
        :max="300"
        :step="1"
      />
      <ToolSlider
        v-model:value="bgOpacity"
        label="BG opacity"
        :min="0"
        :max="1"
        :step="0.01"
      />
    </div>

    <div class="grid grid-cols-[1fr] w-full h-full">
      <svg
        ref="container"
        class="col-start-1 col-span-1 row-start-1 row-span-1 w-full h-full"
        :viewBox="svgViewbox"
        data-main-svg
        :disabled="!bgImageLoaded"
        preserveAspectRatio="xMinYMin meet"
      >
        <defs>
          <pattern
            id="grid"
            :height="mapScale.unitLengthPx"
            :width="mapScale.unitLengthPx"
            patternUnits="userSpaceOnUse"
          >
            <path
              :d="`M ${mapScale.unitLengthPx} 0 L 0 0 0 ${mapScale.unitLengthPx}`"
              fill="none"
              stroke="gray"
              stroke-width="0.5"
            />
          </pattern>
        </defs>
        <image
          v-if="imgSrc"
          ref="bgImage"
          :xlink:href="imgSrc"
          x="0"
          y="0"
          :width="imgWidth"
          :height="imgHeight"
          :opacity="bgOpacity"
        />
        <text
          v-else
          x="50%"
          y="50%"
          fill="red"
          text-anchor="middle"
          dominant-baseline="middle"
          data-onboarding-text
        >
          Paste an aerial photo of your plot of land here. You can use Google Maps to take
          a screenshot
        </text>
        <rect
          v-if="mapScale.unitLengthPx"
          x="0"
          y="0"
          :width="imgWidth"
          :height="imgHeight"
          fill="url(#grid)"
          class="pointer-events-none"
        />
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
        ></GardenGuild>

        <GardenFeature
          v-for="thing in garden.allGardenPlants"
          :key="thing.id"
          :thing="thing"
          :plant="garden.plantsById[thing.plantId]"
          :active="garden.selectedId === thing.id || garden.hoveredId === thing.id"
          :scale="camera.scale"
          :unit-length-px="mapScale.unitLengthPx"
          @delete="garden.deleteFeature(thing.id)"
          @click="garden.selectedId = thing.id"
          @update="($event) => garden.updateFeature(thing.guildId, thing.id, $event)"
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

        <OnboardingText
          v-if="imgSrc && onboarding.onboardingState !== 'done'"
          :x="center.x"
          :y="center.y"
          :onboarding-state="onboarding.onboardingState"
        />

        <ReferenceLine />
      </svg>
    </div>

    <ThingBar />
  </div>
</template>
