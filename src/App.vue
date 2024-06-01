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
import GardenFeatures from './GardenFeatures.vue';
import OnboardingText from './OnboardingText.vue';
import PlantCreator from './PlantCreator.vue';
import PlantParts from './PlantParts.vue';
import ThingBar from './ThingBar.vue';
import ToolBar from './ToolBar.vue';
import ToolSlider from './ToolSlider.vue';
import ReferenceLine from './ReferenceLine.vue';
import { useSVGCanvas } from './useSVGCanvas';

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

const { camera, setupCamera, teardownCamera, fitToViewPort } = useCamera(
  container,
  computed(() => ({
    viewportHeight: containerHeight.value,
    viewportWidth: containerWidth.value,
    contentHeight: imgHeight.value,
    contentWidth: imgWidth.value,
  })),
);

const { width: containerWidth, height: containerHeight } = useElementSize(container);
onMounted(() => setupCamera());
onBeforeUnmount(() => teardownCamera());

const svgViewbox = computed(() => {
  const x = (camera.value.x / camera.value.scale).toFixed(2);
  const y = (camera.value.y / camera.value.scale).toFixed(2);
  const width = (containerWidth.value / camera.value.scale).toFixed(2);
  const height = (containerHeight.value / camera.value.scale).toFixed(2);
  return `${x} ${y} ${width} ${height}`;
});

const center = computed(() => {
  const x = camera.value.x / camera.value.scale;
  const y = camera.value.y / camera.value.scale;
  const width = containerWidth.value / camera.value.scale;
  const height = containerHeight.value / camera.value.scale;
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
    x: (x + camera.value.x) / camera.value.scale,
    y: (y + camera.value.y) / camera.value.scale,
    width: width / camera.value.scale,
    height: height / camera.value.scale,
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

const updateBed = (bed: GardenBedType) => {
  const index = store.gardenBeds.findIndex((b) => b.id === bed.id);
  store.gardenBeds[index] = bed;
  store.selectedId = undefined;
  store.hoveredId = undefined;
};

const { mouseX, mouseY } = useSVGCanvas(container, camera);
</script>

<template>
  <PlantParts />
  <div class="grid grid-cols-[200px_1fr_250px] w-full h-full justify-stretch">
    <div class="p-2 flex flex-grow flex-col items-stretch gap-1 text-sky-200">
      <ToolBar />
      <PlantCreator />
      <button @click.stop="startDrawBed">
        bed
      </button>
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
        <GardenBed
          v-for="bed in store.gardenBeds"
          :key="bed.id"
          :selected="store.selectedId === bed.id"
          :hovered="store.hoveredId === bed.id"
          :bed="bed"
          :scale="camera.scale"
          :mouse-x="mouseX"
          :mouse-y="mouseY"
          @cancel="store.deactivateAll"
          @click="store.selectedId = bed.id"
          @click.shift="store.removeBed(bed.id)"
          @mouseenter="store.hoveredId = bed.id"
          @mouseleave="store.hoveredId = undefined"
          @update="updateBed"
        />
        <GardenFeatures :scale="camera.scale" />
        <GardenFeature
          v-if="newShape && store.plant"
          :thing="newShape"
          :plant="store.plant"
          active
          :scale="camera.scale"
        />

        <GardenBed
          v-if="newBed"
          :mouse-x="mouseX"
          :mouse-y="mouseY"
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
