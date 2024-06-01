<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue';
import { v4 as uuidV4 } from 'uuid';

import { useBackgroundImage } from './useBackgroundImage';
import { useCamera } from './useCamera';
import { useDrawBox } from './useDrawBox';
import { useElementSize, useStorage } from '@vueuse/core';
import { useMapScale } from './useMapScale';
import { type GardenBed as GardenBedType, useStore, type GardenThing } from './useStore';
import GardenBed from './GardenBed.vue';
import GardenFeature from './GardenFeature.vue';
import TheGarden from './TheGarden.vue';
import OnboardingText from './OnboardingText.vue';
import PlantCreator from './PlantCreator.vue';
import PlantParts from './PlantParts.vue';
import ThingBar from './ThingBar.vue';
import ToolBar from './ToolBar.vue';
import ToolSlider from './ToolSlider.vue';
import ReferenceLine from './ReferenceLine.vue';

import { useCameraStore } from './useCameraStore';
import { useSceneMousePositionStore } from './useSceneMousePositionStore';
import { useSceneMousePosition } from './useSceneMousePosition';

const {
  setupBackgroundImagePaste,
  teardownBackgroundImagePaste,
  imgWidth,
  imgHeight,
  imgSrc,
  ready: bgImageReady,
} = useBackgroundImage();
onMounted(() => setupBackgroundImagePaste());
onBeforeUnmount(() => teardownBackgroundImagePaste());
watch(bgImageReady, (ready) => ready && fitToViewPort());

const store = useStore();

const container = ref<SVGElement>();

const { setupCamera, teardownCamera, fitToViewPort } = useCamera(
  container,
  computed(() => ({
    viewportHeight: containerHeight.value,
    viewportWidth: containerWidth.value,
    contentHeight: imgHeight.value,
    contentWidth: imgWidth.value,
  })),
);

const camera = useCameraStore();

const { width: containerWidth, height: containerHeight } = useElementSize(container);
onMounted(() => setupCamera());
onBeforeUnmount(() => teardownCamera());

const svgViewbox = computed(() => {
  const x = (camera.x / camera.scale).toFixed(2);
  const y = (camera.y / camera.scale).toFixed(2);
  const width = (containerWidth.value / camera.scale).toFixed(2);
  const height = (containerHeight.value / camera.scale).toFixed(2);
  return `${x} ${y} ${width} ${height}`;
});

const center = computed(() => {
  const x = camera.x / camera.scale;
  const y = camera.y / camera.scale;
  const width = containerWidth.value / camera.scale;
  const height = containerHeight.value / camera.scale;
  return {
    x: x + width / 2,
    y: y + height / 2,
  };
});

const { isDrawing, drawingBbox, startDraw } = useDrawBox(
  computed(() => !!store.plant),
  container,
  () => newShape.value && store.gardenThings.push({ ...newShape.value }),
);

const newShape = computed<GardenThing | void>(() => {
  if (!isDrawing.value || !store.plant || !container.value) {
    return;
  }

  const x = Math.min(drawingBbox.value.x, drawingBbox.value.x + drawingBbox.value.width);
  const y = Math.min(drawingBbox.value.y, drawingBbox.value.y + drawingBbox.value.height);
  const width = Math.abs(drawingBbox.value.width);
  const height = Math.abs(drawingBbox.value.height);

  return {
    id: uuidV4(),
    type: 'plant',
    plantId: store.plant.id,
    x: (x + camera.x) / camera.scale,
    y: (y + camera.y) / camera.scale,
    width: width / camera.scale,
    height: height / camera.scale,
  };
});

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'z' && e.metaKey) {
    store.gardenThings.pop();
  }
};

onMounted(() => document.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown));

const bgImage = ref<SVGImageElement>();

const {
  mapScaleReferenceLine,
  mapScaleReferenceLineRealLength,
  mapScaleUnitLengthPx,
  startMoveScaleStart,
  startMoveScaleEnd,
  onboardingState,
} = useMapScale(camera);

const bgOpacity = useStorage('bgOpacity', 0.4);

const newBed = ref<GardenBedType>();

const startDrawBed = () => {
  nextTick(() => {
    newBed.value = {
      id: uuidV4(),
      points: [],
    };
    store.plant = undefined;
  });
};

const addNewBed = (bed: GardenBedType) => {
  store.gardenBeds.push(bed);
  newBed.value = undefined;
};

useSceneMousePosition(container);
const sceneMouse = useSceneMousePositionStore();
</script>

<template>
  <PlantParts />
  <div class="grid grid-cols-[200px_1fr_250px] w-full h-full justify-stretch">
    <div class="p-2 flex flex-grow flex-col items-stretch gap-1 text-sky-200">
      <ToolBar />
      <PlantCreator />
      <button @click.stop="startDrawBed">bed</button>
      <ToolSlider
        v-model:value="mapScaleReferenceLineRealLength"
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
        @mousedown="startDraw"
      >
        <defs>
          <pattern
            id="grid"
            :height="mapScaleUnitLengthPx"
            :width="mapScaleUnitLengthPx"
            patternUnits="userSpaceOnUse"
          >
            <path
              :d="`M ${mapScaleUnitLengthPx} 0 L 0 0 0 ${mapScaleUnitLengthPx}`"
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
        >
          Paste an aerial photo of your plot of land here. You can use Google Maps to take a
          screenshot
        </text>
        <rect
          v-if="mapScaleUnitLengthPx"
          x="0"
          y="0"
          :width="imgWidth"
          :height="imgHeight"
          fill="url(#grid)"
          class="pointer-events-none"
        />
        <TheGarden />
        <GardenFeature
          v-if="newShape && store.plant"
          :thing="newShape"
          :plant="store.plant"
          active
          :scale="camera.scale"
        />

        <GardenBed
          v-if="newBed"
          :mouse-x="sceneMouse.x"
          :mouse-y="sceneMouse.y"
          :bed="newBed"
          hovered
          selected
          :scale="camera.scale"
          @update="addNewBed"
        />

        <OnboardingText
          v-if="imgSrc && onboardingState !== 'done'"
          :x="center.x"
          :y="center.y"
          :onboarding-state="onboardingState"
        />

        <ReferenceLine
          v-if="mapScaleReferenceLine"
          :line="mapScaleReferenceLine"
          :length="mapScaleReferenceLineRealLength"
          @start-move-scale-start="startMoveScaleStart"
          @start-move-scale-end="startMoveScaleEnd"
        />
      </svg>
    </div>

    <ThingBar />
  </div>
</template>
