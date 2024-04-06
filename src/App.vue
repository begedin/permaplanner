<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { tools } from './data'
import GardenFeature from './GardenFeature.vue'
import GardenSymbols from './GardenSymbols.vue'
import ToolButton from './ToolButton.vue'
import type { GardenThing, Tool } from './data'
import { useCamera } from './useCamera'
import { useElementSize } from '@vueuse/core'
import { useBackgroundImage } from './useBackgroundImage'
import { useMapScale } from './useMapScale'

const {
  setImageSrc,
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

onMounted(async () => {
  const src = localStorage.getItem('imgSrc')
  if (src) {
    setImageSrc(src)
  }

  const storedShapes = localStorage.getItem('shapes')
  if (storedShapes) {
    shapes.value = JSON.parse(storedShapes)
  }
})

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

const tool = ref<Tool>(tools[0])

const shapes = ref<GardenThing[]>([])

watch(shapes, () => localStorage.setItem('shapes', JSON.stringify(shapes.value)), { deep: true })

const shapeStart = ref({ x: 0, y: 0 })
const shapeEnd = ref<{ x: number; y: number }>()

const newShape = computed<GardenThing | void>(() => {
  if (!shapeEnd.value || !tool.value || !container.value) {
    return
  }

  const x = Math.min(shapeStart.value.x, shapeEnd.value.x)
  const y = Math.min(shapeStart.value.y, shapeEnd.value.y)
  const width = Math.abs(shapeStart.value.x - shapeEnd.value.x)
  const height = Math.abs(shapeStart.value.y - shapeEnd.value.y)

  return {
    kind: tool.value.kind,
    name: tool.value.name,
    x: (x + camera.value.x) / camera.value.scale,
    y: (y + camera.value.y) / camera.value.scale,
    width: width / camera.value.scale,
    height: height / camera.value.scale,
  }
})

const startDraw = (e: MouseEvent) => {
  if (!tool.value || e.button !== 0 || e.shiftKey || !container.value) {
    return
  }

  const svgOffsetX = container.value.getBoundingClientRect().left
  const svgOffsetY = container.value.getBoundingClientRect().top

  const x = e.clientX - svgOffsetX
  const y = e.clientY - svgOffsetY

  shapeStart.value = { x, y }
  shapeEnd.value = { x, y }

  const controller = new AbortController()

  document.addEventListener(
    'mousemove',
    (moveE: MouseEvent) =>
      (shapeEnd.value = { x: moveE.clientX - svgOffsetX, y: moveE.clientY - svgOffsetY }),
    { signal: controller.signal },
  )

  document.addEventListener(
    'mouseup',
    () => {
      const shape = newShape.value
      if (!shape || shape.width < 0.01 || shape.height < 0.01) {
        return
      }

      shapes.value.push({ ...shape })
      shapeEnd.value = undefined
      controller.abort()
    },
    { once: true },
  )
}

const deleteShape = (index: number) => {
  shapes.value.splice(index, 1)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'z' && e.metaKey) {
    shapes.value.pop()
  }
}

onMounted(() => document.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', handleKeydown))

const selectedIndex = ref<number | null>(null)
const hoveredIndex = ref<number | null>(null)

const bgImage = ref<SVGImageElement>()

const {
  mapScaleReferenceCentroid,
  mapScaleReferenceLine,
  mapScaleReferenceLineRealLength,
  mapScaleUnitLengthPx,
  setupMapScale,
  startMoveScaleStart,
  startMoveScaleEnd,
} = useMapScale(camera)

setupMapScale()
</script>

<template>
  <GardenSymbols />
  <div class="grid grid-cols-[150px_1fr_150px] w-full h-full justify-stretch">
    <div class="p-2 flex flex-grow flex-col items-start gap-1 text-sky-200">
      <ToolButton
        v-for="t in tools"
        @click="tool = t"
        :tool-kind="t.kind"
        :tool-name="t.name"
        :active="tool?.kind === t.kind"
      />
      <input type="range" min="1" max="200" step="1" v-model="mapScaleReferenceLineRealLength" />
      <div>{{ mapScaleReferenceLineRealLength }}</div>
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
          opacity="0.5"
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

        <GardenFeature
          :shape="shape"
          v-for="(shape, index) in shapes"
          @delete="deleteShape(index)"
          :active="selectedIndex === index || hoveredIndex === index"
          @click="selectedIndex = index"
          @update="($event) => (shapes[index] = $event)"
          :scale="camera.scale"
        />
        <GardenFeature v-if="newShape" :shape="newShape" active :scale="camera.scale" />

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
        v-for="(shape, index) in shapes"
        @click="selectedIndex = index"
        @click.shift="deleteShape(index)"
        @mouseenter="hoveredIndex = index"
        @mouseleave="hoveredIndex = null"
      >
        {{ shape.name }}
      </button>
    </div>
  </div>
</template>
