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

const {
  setImageSrc,
  setupBackgroundImagePaste,
  teardownBackgroundImagePaste,
  imgWidth,
  imgHeight,
  imgSrc
} = useBackgroundImage()
onMounted(() => setupBackgroundImagePaste())
onBeforeUnmount(() => teardownBackgroundImagePaste())

onMounted(() => {
  const src = localStorage.getItem('imgSrc')
  if (src) {
    setImageSrc(src)
  }

  const storedShapes = localStorage.getItem('shapes')
  if (storedShapes) {
    shapes.value = JSON.parse(storedShapes)
  }
})

const topLayer = ref<SVGElement>()
const { camera, setupCamera, teardownCamera } = useCamera(topLayer)
const { width: containerWidth, height: containerHeight } = useElementSize(topLayer)
onMounted(() => setupCamera())
onBeforeUnmount(() => teardownCamera())

const svgViewbox = computed(() => {
  const x = (camera.value.x / camera.value.scale).toFixed(2)
  const y = (camera.value.y / camera.value.scale).toFixed(2)
  const width = (imgWidth.value / camera.value.scale).toFixed(2)
  const height = (imgHeight.value / camera.value.scale).toFixed(2)
  return `${x} ${y} ${width} ${height}`
})

const tool = ref<Tool>()

const shapes = ref<GardenThing[]>([])

watch(shapes, () => localStorage.setItem('shapes', JSON.stringify(shapes.value)), { deep: true })

const scaledShapes = computed<GardenThing[]>(() => shapes.value.map((s) => scaleUp(s)))

const shapeStart = ref({ x: 0, y: 0 })
const shapeEnd = ref<{ x: number; y: number }>()

const getScaledX = (offsetX: number) =>
  ((offsetX + camera.value.x) / containerWidth.value) * camera.value.scale

const getScaledY = (offsetY: number) =>
  ((offsetY + camera.value.y) / containerHeight.value) * camera.value.scale

const start = (e: MouseEvent) => {
  if (!tool.value) {
    return
  }

  if (e.button !== 0 || e.shiftKey) {
    return
  }

  const x = getScaledX(e.offsetX)
  const y = getScaledY(e.offsetY)

  shapeStart.value = { x, y }
  shapeEnd.value = { x, y }
}

const update = (e: MouseEvent) => {
  if (!shapeStart.value) {
    return
  }
  if (!shapeEnd.value) {
    return
  }
  shapeEnd.value = { x: getScaledX(e.offsetX), y: getScaledY(e.offsetY) }
}

const end = () => {
  if (!shapeEnd.value || !tool.value) {
    return
  }

  const width = Math.abs(shapeStart.value.x - shapeEnd.value.x)
  const height = Math.abs(shapeStart.value.y - shapeEnd.value.y)

  if (width < 0.01 || height < 0.01) {
    return
  }

  shapes.value.push({
    kind: tool.value.kind,
    name: tool.value.name,
    x: Math.min(shapeStart.value.x, shapeEnd.value.x),
    y: Math.min(shapeStart.value.y, shapeEnd.value.y),
    width: Math.abs(shapeStart.value.x - shapeEnd.value.x),
    height: Math.abs(shapeStart.value.y - shapeEnd.value.y)
  })
  shapeEnd.value = undefined
}

const newShape = computed<GardenThing | void>(() => {
  if (!shapeEnd.value || !tool.value) {
    return
  }

  const x = Math.min(shapeStart.value.x, shapeEnd.value.x)
  const y = Math.min(shapeStart.value.y, shapeEnd.value.y)
  const width = Math.abs(shapeStart.value.x - shapeEnd.value.x)
  const height = Math.abs(shapeStart.value.y - shapeEnd.value.y)

  return scaleUp({
    kind: tool.value.kind,
    name: tool.value.name,
    x,
    y,
    width,
    height
  })
})

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

const scaleUp = (shape: GardenThing): GardenThing => {
  return {
    ...shape,
    x: shape.x * imgWidth.value,
    y: shape.y * imgHeight.value,
    width: shape.width * imgWidth.value,
    height: shape.height * imgHeight.value
  }
}

const scaleDown = (shape: GardenThing): GardenThing => ({
  ...shape,
  x: shape.x / imgWidth.value,
  y: shape.y / imgHeight.value,
  width: shape.width / imgWidth.value,
  height: shape.height / imgHeight.value
})

const scaleSettingPhase = ref<'startPoint' | 'endPoint' | 'length'>()
const scaleStartPoint = ref<{ x: number; y: number }>()
const scaleEndPoint = ref<{ x: number; y: number }>()
const setScaleStart = () => {
  scaleSettingPhase.value = 'startPoint'
}

const setScalePoint = (e: MouseEvent) => {
  if (scaleSettingPhase.value === 'startPoint') {
    scaleStartPoint.value = { x: e.offsetX, y: e.offsetY }
    scaleSettingPhase.value = 'endPoint'
    return
  }

  scaleEndPoint.value = { x: e.offsetX, y: e.offsetY }
  scaleSettingPhase.value = 'length'
}

const setScalePath = computed(() => {
  if (!scaleStartPoint.value || !scaleEndPoint.value) {
    return
  }

  const xFactor = imgWidth.value / containerWidth.value
  const yFactor = imgHeight.value / containerHeight.value

  const x1 = scaleStartPoint.value.x * xFactor
  const y1 = scaleStartPoint.value.y * yFactor
  const x2 = scaleEndPoint.value.x * xFactor
  const y2 = scaleEndPoint.value.y * yFactor

  return `M ${x1} ${y1} ${x2} ${y2} Z`
})

const scalePathCentroid = computed(() => {
  if (!scaleStartPoint.value || !scaleEndPoint.value) {
    return null
  }

  const xFactor = imgWidth.value / containerWidth.value
  const yFactor = imgHeight.value / containerHeight.value

  const x = Math.abs((scaleStartPoint.value.x + scaleEndPoint.value.x) / 2) * xFactor
  const y = Math.abs((scaleStartPoint.value.y + scaleEndPoint.value.y) / 2) * yFactor

  return { x, y }
})

const scaleIndicatorLength = ref<number>(1)
</script>

<template>
  <GardenSymbols />
  <div class="flex place-items-center w-full h-full justify-center">
    <div class="grid grid-cols-[1fr] place-items-center flex-grow max-w-[80vw]">
      <svg
        @mousedown="($event) => (!!scaleSettingPhase ? setScalePoint($event) : start($event))"
        @mousemove="update"
        @mouseup="end"
        ref="topLayer"
        class="col-start-1 col-span-1 row-start-1 row-span-1 w-full h-full"
        :viewBox="svgViewbox"
      >
        <image
          ref="bgImage"
          :xlink:href="imgSrc"
          x="0"
          y="0"
          :width="imgWidth"
          :height="imgHeight"
          opacity="0.5"
        />
        <GardenFeature
          :shape="shape"
          v-for="(shape, index) in scaledShapes"
          @delete="deleteShape(index)"
          :active="selectedIndex === index || hoveredIndex === index"
          @click="selectedIndex = index"
          @update="($event) => (shapes[index] = scaleDown($event))"
          :scale="camera.scale"
        />
        <GardenFeature v-if="newShape" :shape="newShape" active :scale="camera.scale" />
        <path v-if="setScalePath" :d="setScalePath" stroke="red" />
        <text
          v-if="scaleIndicatorLength && scalePathCentroid"
          :x="scalePathCentroid.x"
          :y="scalePathCentroid.y"
          fill="red"
        >
          {{ scaleIndicatorLength }}
        </text>
      </svg>
      <div
        v-if="scaleSettingPhase === 'length'"
        class="col-start-1 col-span-1 row-start-1 row-span-1 p-4 bg-white shadow-sm rounded-md"
      >
        <label>
          Scale factor:
          <input type="number" v-model="scaleIndicatorLength" />
        </label>
        <button @click="scaleSettingPhase = undefined">Done</button>
      </div>
    </div>
    <div class="absolute left-0 top-0 p-2 flex flex-col items-start gap-1 text-sky-200">
      <ToolButton
        v-for="t in tools"
        @click="tool = t"
        :tool-kind="t.kind"
        :tool-name="t.name"
        :active="tool?.kind === t.kind"
      />
      <div>
        {{ camera.scale.toFixed(2) }}
      </div>
      <button @click="setScaleStart()">Set scale</button>
      <div>{{ scaleSettingPhase }}</div>
      <div>{{ scaleStartPoint }}</div>
      <div>{{ scaleEndPoint }}</div>
      <div>{{ setScalePath }}</div>
    </div>
    <div class="absolute right-0 top-0 p-2 flex flex-col gap-1">
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
