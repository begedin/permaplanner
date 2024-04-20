<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { v4 as uuidV4 } from 'uuid'

import PlantParts from './PlantParts.vue'

import { useCamera } from './useCamera'
import { useElementSize } from '@vueuse/core'
import { useBackgroundImage } from './useBackgroundImage'
import { useMapScale } from './useMapScale'
import OnboardingText from './OnboardingText.vue'
import PlantCreator from './PlantCreator.vue'
import { useStore, type GardenThing } from './useStore'
import ToolBar from './ToolBar.vue'
import GardenFeatures from './GardenFeatures.vue'
import GardenFeature from './GardenFeature.vue'
import ToolSlider from './ToolSlider.vue'
import { useDrawBox } from './useDrawBox'

const {
  setupBackgroundImagePaste,
  teardownBackgroundImagePaste,
  imgWidth,
  imgHeight,
  imgSrc,
  ready: bgImageReady,
} = useBackgroundImage()
onMounted(() => setupBackgroundImagePaste())
onBeforeUnmount(() => teardownBackgroundImagePaste())
watch(bgImageReady, (ready) => ready && fitToViewPort())

const store = useStore()

const container = ref<SVGElement>()
const { camera, setupCamera, teardownCamera, fitToViewPort } = useCamera(
  container,
  computed(() => ({
    viewportHeight: containerHeight.value,
    viewportWidth: containerWidth.value,
    contentHeight: imgHeight.value,
    contentWidth: imgWidth.value,
  })),
)
const { width: containerWidth, height: containerHeight } = useElementSize(container)
onMounted(() => setupCamera())
onBeforeUnmount(() => teardownCamera())

const svgViewbox = computed(() => {
  const x = (camera.value.x / camera.value.scale).toFixed(2)
  const y = (camera.value.y / camera.value.scale).toFixed(2)
  const width = (containerWidth.value / camera.value.scale).toFixed(2)
  const height = (containerHeight.value / camera.value.scale).toFixed(2)
  return `${x} ${y} ${width} ${height}`
})

const center = computed(() => {
  const x = camera.value.x / camera.value.scale
  const y = camera.value.y / camera.value.scale
  const width = containerWidth.value / camera.value.scale
  const height = containerHeight.value / camera.value.scale
  return {
    x: x + width / 2,
    y: y + height / 2,
  }
})

const { isDrawing, drawingBbox, startDraw } = useDrawBox(
  computed(() => !!store.plant),
  container,
  () => newShape.value && store.gardenThings.push({ ...newShape.value }),
)

const newShape = computed<GardenThing | void>(() => {
  if (!isDrawing.value || !store.plant || !container.value) {
    return
  }

  const x = Math.min(drawingBbox.value.x, drawingBbox.value.x + drawingBbox.value.width)
  const y = Math.min(drawingBbox.value.y, drawingBbox.value.y + drawingBbox.value.height)
  const width = Math.abs(drawingBbox.value.width)
  const height = Math.abs(drawingBbox.value.height)

  return {
    id: uuidV4(),
    plantId: store.plant.id,
    x: (x + camera.value.x) / camera.value.scale,
    y: (y + camera.value.y) / camera.value.scale,
    width: width / camera.value.scale,
    height: height / camera.value.scale,
  }
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'z' && e.metaKey) {
    store.gardenThings.pop()
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))

const bgImage = ref<SVGImageElement>()

const {
  mapScaleReferenceCentroid,
  mapScaleReferenceLine,
  mapScaleReferenceLineRealLength,
  mapScaleUnitLengthPx,
  startMoveScaleStart,
  startMoveScaleEnd,
  onboardingState,
} = useMapScale(camera)

const bgOpacity = ref(0.4)
</script>

<template>
  <PlantParts />
  <div class="grid grid-cols-[150px_1fr_150px] w-full h-full justify-stretch">
    <div class="p-2 flex flex-grow flex-col items-stretch gap-1 text-sky-200">
      <ToolBar />
      <PlantCreator />
      <ToolSlider
        label="Map scale"
        :min="1"
        :max="300"
        :step="1"
        v-model:value="mapScaleReferenceLineRealLength"
      />
      <ToolSlider label="BG opacity" :min="0" :max="1" :step="0.01" v-model:value="bgOpacity" />
    </div>

    <div class="grid grid-cols-[1fr] w-full h-full">
      <svg
        @mousedown="startDraw"
        ref="container"
        class="col-start-1 col-span-1 row-start-1 row-span-1 w-full h-full"
        :viewBox="svgViewbox"
      >
        <defs>
          <pattern
            :height="mapScaleUnitLengthPx"
            :width="mapScaleUnitLengthPx"
            patternUnits="userSpaceOnUse"
            id="grid"
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
        <text v-else x="50%" y="50%" fill="red" text-anchor="middle" dominant-baseline="middle">
          Paste an aerial photo of your plot of land here. You can use Google Maps to take a
          screenshot
        </text>
        <rect
          x="0"
          y="0"
          v-if="mapScaleUnitLengthPx"
          :width="imgWidth"
          :height="imgHeight"
          fill="url(#grid)"
          class="pointer-events-none"
        ></rect>
        <GardenFeatures :scale="camera.scale" />
        <GardenFeature
          v-if="newShape && store.plant"
          :thing="newShape"
          :plant="store.plant"
          active
          :scale="camera.scale"
        />
        <OnboardingText
          v-if="imgSrc && onboardingState !== 'done'"
          :x="center.x"
          :y="center.y"
          :onboarding-state="onboardingState"
        />

        <line
          v-if="mapScaleReferenceLine"
          stroke="red"
          :x1="mapScaleReferenceLine.x1"
          :x2="mapScaleReferenceLine.x2"
          :y1="mapScaleReferenceLine.y1"
          :y2="mapScaleReferenceLine.y2"
        />

        <circle
          v-if="mapScaleReferenceLine"
          :cx="mapScaleReferenceLine.x1"
          :cy="mapScaleReferenceLine.y1"
          r="5"
          class="hover:[r:8]"
          fill="red"
          @mousedown.stop="startMoveScaleStart"
        />

        <circle
          v-if="mapScaleReferenceLine"
          :cx="mapScaleReferenceLine.x2"
          :cy="mapScaleReferenceLine.y2"
          r="5"
          class="hover:[r:8]"
          fill="red"
          @mousedown.stop="startMoveScaleEnd"
        />

        <text
          v-if="mapScaleReferenceCentroid"
          :x="mapScaleReferenceCentroid.x"
          :y="mapScaleReferenceCentroid.y"
          fill="red"
        >
          {{ mapScaleReferenceLineRealLength }}
        </text>
      </svg>
    </div>

    <div class="p-2 flex flex-col gap-1">
      <button
        v-for="({ plant }, index) in store.gardenThingsWithPlants"
        @click="store.selectedIndex = index"
        @click.shift="store.deleteFeature(index)"
        @mouseenter="store.hoveredIndex = index"
        @mouseleave="store.hoveredIndex = undefined"
      >
        {{ plant.name }}
      </button>
    </div>
  </div>
</template>
