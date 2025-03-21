<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';

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
import { usePermaplannerStore } from './usePermaplannerStore';

const permaplannerStore = usePermaplannerStore();

const {
  setupBackgroundImagePaste,
  teardownBackgroundImagePaste,
  imgWidth,
  imgHeight,
  imgDataUrl,
  ready,
} = useBackgroundImage();

onBeforeMount(async () => {
  setupBackgroundImagePaste();
  await permaplannerStore.loadFromDB();
});

onBeforeUnmount(() => teardownBackgroundImagePaste());

const container = ref<SVGElement>();

const { width: containerWidth, height: containerHeight } = useElementSize(container);

const cameraParams = computed(() => ({
  containerHeight: containerHeight.value,
  containerWidth: containerWidth.value,
  backgroundNaturalHeight: imgHeight.value,
  backgroundNaturalWidth: imgWidth.value,
}));

const { setupCamera, teardownCamera, fitToViewPort } = useCamera(container, cameraParams);

const disabled = ref(true);

watch(ready, async () => {
  if (!ready.value) {
    return;
  }

  fitToViewPort();
  setupCamera();

  setTimeout(() => {
    fitToViewPort();
    disabled.value = false;
  }, 1000);
});

const camera = useCameraStore();

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

const getNewShape = (plantId: string): GardenThing => {
  const x = Math.min(scene.worldBox.x, scene.worldBox.x + scene.worldBox.width);
  const y = Math.min(scene.worldBox.y, scene.worldBox.y + scene.worldBox.height);
  const width = Math.abs(scene.worldBox.width);
  const height = Math.abs(scene.worldBox.height);

  return {
    id: uuidV4(),
    plantId,
    x,
    y,
    width,
    height,
    nameOrCultivar:
      garden.plantsById[plantId].cultivar || garden.plantsById[plantId].name,
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
      // just finished drawing
      const shape = getNewShape(garden.plant.id);
      const overlappingGuild = garden.getOverlappingGuild(shape);

      if (!overlappingGuild) {
        return;
      }

      overlappingGuild.plants.push({
        ...shape,
        x: shape.x,
        y: shape.y,
        nameOrCultivar: garden.plant.cultivar || garden.plant.name,
      });
    }
  },
);

const fileOptions = (fileName: string = 'myNewPlan.permaplanner') => ({
  types: [{ accept: { 'application/json': ['.permaplanner' as const] } }],
  suggestedName: fileName,
  startIn: 'documents' as const,
});

const load = async () => {
  const options = fileOptions();
  try {
    const [fileHandle] = await window.showOpenFilePicker(options);
    await permaplannerStore.load(fileHandle);
  } catch (e) {
    console.error(e);
  }
};

const newPlan = async () => {
  try {
    const options = fileOptions('myNewPlan.permaplanner');
    const fileHandle = await window.showSaveFilePicker(options);

    permaplannerStore.save(fileHandle);
    onboarding.onboardingState = 'initial';
  } catch (e) {
    console.error(e);
  }
};

const save = async () => {
  try {
    const fileHandle =
      permaplannerStore.fileHandle ||
      (await window.showSaveFilePicker(fileOptions(permaplannerStore.fileName)));
    permaplannerStore.fileHandle = fileHandle;
    permaplannerStore.fileName = fileHandle.name;
    permaplannerStore.save(fileHandle);
  } catch (e) {
    console.error(e);
  }
};

const saveAs = async () => {
  try {
    const options = fileOptions(permaplannerStore.fileName);
    const fileHandle = await window.showSaveFilePicker(options);
    permaplannerStore.save(fileHandle);
  } catch (e) {
    console.error(e);
  }
};
</script>

<template>
  <div class="flex flex-row items-stretch h-full">
    <div class="p-2 flex w-[200px] flex-col items-stretch gap-1 bg-gray-50">
      <template v-if="permaplannerStore.fileName">
        <ToolBarButton
          v-for="plant in garden.plants"
          :key="plant.id"
          :plant="plant"
          :active="garden.plant?.id === plant.id"
          :disabled="disabled"
          @click="garden.plant = plant"
        />
        <button
          class="p-1 rounded"
          :class="
            (garden.newGuild && ['bg-green-400 hover:bg-green-500']) || [
              'bg-green-200 hover:bg-green-300 disabled:opacity-50',
            ]
          "
          :disabled="disabled"
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
        <span>{{ permaplannerStore.fileName }}</span>
        <button
          class="bg-green-200 hover:bg-green-300 rounded p-1"
          @click="save"
        >
          Save plan
        </button>
        <button
          class="bg-green-200 hover:bg-green-300 rounded p-1"
          @click="saveAs"
        >
          Save as...
        </button>
      </template>
      <button
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="load"
      >
        Open plan
      </button>
      <button
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="newPlan"
      >
        New plan
      </button>
    </div>

    <div class="flex flex-col flex-1">
      <svg
        v-if="permaplannerStore.fileName"
        ref="container"
        :viewBox="svgViewbox"
        data-main-svg
        :disabled="disabled"
        preserveAspectRatio="xMinYMin meet"
        class="min-h-0"
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
          v-if="imgDataUrl"
          ref="bgImage"
          :xlink:href="imgDataUrl"
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
          :plant="garden.plantsById[thing.plantId] || garden.plantsById['default']"
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
          v-if="imgDataUrl && onboarding.onboardingState !== 'done'"
          :x="center.x"
          :y="center.y"
          :onboarding-state="onboarding.onboardingState"
        />

        <ReferenceLine />
      </svg>
    </div>
    <div
      v-if="permaplannerStore.fileName"
      class="overflow-y-auto w-[300px]"
    >
      <ThingBar />
    </div>
  </div>
</template>
