<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { useBackgroundImage } from './useBackgroundImage';
import { useCamera } from './useCamera';
import { useElementSize, useStorage } from '@vueuse/core';
import { useMapScale } from './useMapScale';
import { useGardenStore } from './useGardenStore';
import TheGarden from './TheGarden.vue';
import OnboardingText from './OnboardingText.vue';
import ThingBar from './ThingBar.vue';
import ToolBarButton from './ToolBarButton.vue';
import ToolSlider from './ToolSlider.vue';
import ReferenceLine from './ReferenceLine.vue';

import { useCameraStore } from './useCameraStore';
import { useScene } from './useScene';
import { useMapScaleStore } from './useMapScaleStore';

const { setupBackgroundImagePaste, teardownBackgroundImagePaste, imgWidth, imgHeight, imgSrc } =
  useBackgroundImage();
onMounted(() => setupBackgroundImagePaste());
onBeforeUnmount(() => teardownBackgroundImagePaste());

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
  return { x: x + width / 2, y: y + height / 2 };
});

const bgImage = ref<SVGImageElement>();
const { width: imgElementWidth, height: imgElementHeight } = useElementSize(bgImage);

const bgImageLoaded = computed(
  () => imgElementWidth.value === imgWidth.value && imgElementHeight.value === imgHeight.value,
);

watch(bgImageLoaded, (loaded) => loaded && fitToViewPort(), { immediate: true });

const { startMoveScaleStart, startMoveScaleEnd, onboardingState } = useMapScale();

const mapScale = useMapScaleStore();

const bgOpacity = useStorage('bgOpacity', 0.4);

useScene(container);

const garden = useGardenStore();
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
          Paste an aerial photo of your plot of land here. You can use Google Maps to take a
          screenshot
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
        <TheGarden />

        <OnboardingText
          v-if="imgSrc && onboardingState !== 'done'"
          :x="center.x"
          :y="center.y"
          :onboarding-state="onboardingState"
        />

        <ReferenceLine
          v-if="mapScale.line"
          :line="mapScale.line"
          :length="mapScale.linePhysicalLength"
          @start-move-scale-start="startMoveScaleStart"
          @start-move-scale-end="startMoveScaleEnd"
        />
      </svg>
    </div>

    <ThingBar />
  </div>
</template>
