<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { tools } from './data'
import GardenFeature from './GardenFeature.vue'
import GardenSymbols from './GardenSymbols.vue'
import ToolButton from './ToolButton.vue'
import type { GardenThing, Tool } from './data'
import { useCamera } from './useCamera'
import { useElementSize } from '@vueuse/core'

const getFileBase64 = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })

const imgSrc = ref<string | null>(null)

const setImage = (src: string) => {
  imgSrc.value = src
  const img = document.createElement('img')
  img.src = imgSrc.value
  document.body.appendChild(img)
  if (img.complete) {
    setDimensions(img)
    img.remove()
  } else {
    img.onload = () => {
      setDimensions(img)
      img.remove()
    }
  }
}

onMounted(() => {
  const src = localStorage.getItem('imgSrc')
  if (src) {
    setImage(src)
  }

  const storedShapes = localStorage.getItem('shapes')
  if (storedShapes) {
    shapes.value = JSON.parse(storedShapes)
  }

  document.addEventListener('paste', async (e) => {
    if (!e.clipboardData || !e.clipboardData.items) return
    const file = e.clipboardData.items[0].getAsFile()
    if (!file) {
      return
    }

    const base64 = await getFileBase64(file)
    setImage(base64)
    localStorage.setItem('imgSrc', base64)
  })
})

const imgWidth = ref(0)
const imgHeight = ref(0)

const setDimensions = (img: HTMLImageElement): void => {
  imgWidth.value = img.width
  imgHeight.value = img.height
}

const topLayer = ref<SVGElement>()
const { camera, setupCamera, teardownCamera } = useCamera(topLayer)
const { width: containerWidth, height: containerHeight } = useElementSize(topLayer)
onMounted(() => setupCamera())
onBeforeUnmount(() => teardownCamera())

const svgViewbox = computed(() => {
  const { scale, x, y } = camera.value
  return `${x / scale} ${y / scale} ${imgWidth.value / scale} ${imgHeight.value / scale}`
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
</script>

<template>
  <GardenSymbols />
  <div class="flex place-items-center w-full h-full justify-center">
    <div class="grid grid-cols-[1fr] place-items-center flex-grow max-w-[80vw]">
      <svg
        @mousedown="start"
        @mousemove="update"
        @mouseup="end"
        ref="topLayer"
        class="col-start-1 col-span-1 row-start-1 row-span-1 z-10 w-full h-full"
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
      </svg>
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
        {{ camera.scale }}
      </div>
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
