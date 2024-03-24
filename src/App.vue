<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useElementSize } from '@vueuse/core'

import { scaleUp, scaleDown } from './geometry'
import { tools } from './data'
import GardenFeature from './GardenFeature.vue'
import GardenSymbols from './GardenSymbols.vue'
import ToolButton from './ToolButton.vue'
import type { GardenThing, Tool } from './data'

const getFileBase64 = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })

const imgSrc = ref<string | null>(null)

onMounted(() => {
  const src = localStorage.getItem('imgSrc')
  if (src) {
    imgSrc.value = src
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
    imgSrc.value = base64
    localStorage.setItem('imgSrc', base64)
  })
})

const img = ref<HTMLImageElement | null>(null)
const { width: imgWidth, height: imgHeight } = useElementSize(img)

const tool = ref<Tool>()

const shapes = ref<GardenThing[]>([])

watch(shapes, () => localStorage.setItem('shapes', JSON.stringify(shapes.value)), { deep: true })

const scaledShapes = computed<GardenThing[]>(() =>
  shapes.value.map((s) => scaleUp(s, imgWidth.value, imgHeight.value))
)

const shapeStart = ref({ x: 0, y: 0 })
const scaledShapeStart = computed(() => ({
  x: shapeStart.value.x * imgWidth.value,
  y: shapeStart.value.y * imgHeight.value
}))
const shapeEnd = ref<{ x: number; y: number }>()
const scaledShapeEnd = computed(() => {
  if (!shapeEnd.value) {
    return undefined
  }
  return {
    x: shapeEnd.value.x * imgWidth.value,
    y: shapeEnd.value.y * imgHeight.value
  }
})

const start = (e: MouseEvent) => {
  if (!tool.value) {
    return
  }

  if (e.button !== 0 || e.shiftKey) {
    return
  }

  shapeStart.value = { x: e.offsetX / imgWidth.value, y: e.offsetY / imgHeight.value }
  shapeEnd.value = { x: e.offsetX / imgWidth.value, y: e.offsetY / imgHeight.value }
}

const update = (e: MouseEvent) => {
  if (!shapeStart.value) {
    return
  }
  if (!shapeEnd.value) {
    return
  }
  shapeEnd.value = { x: e.offsetX / imgWidth.value, y: e.offsetY / imgHeight.value }
}

const end = () => {
  if (!shapeEnd.value || !tool.value) {
    return
  }

  const x = Math.min(shapeStart.value.x, shapeEnd.value.x)
  const y = Math.min(shapeStart.value.y, shapeEnd.value.y)
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

const newShape = computed(() => {
  if (!shapeEnd.value || !tool.value) {
    return
  }

  const x = Math.min(shapeStart.value.x, shapeEnd.value.x)
  const y = Math.min(shapeStart.value.y, shapeEnd.value.y)
  const width = Math.abs(shapeStart.value.x - shapeEnd.value.x)
  const height = Math.abs(shapeStart.value.y - shapeEnd.value.y)

  return scaleUp(
    {
      kind: tool.value.kind,
      name: tool.value.name,
      x,
      y,
      width,
      height
    },
    imgWidth.value,
    imgHeight.value
  )
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
</script>

<template>
  <GardenSymbols />
  <div class="flex place-items-center w-full h-full justify-center">
    <div class="grid grid-cols-[1fr] place-items-center">
      <img
        class="col-start-1 col-span-1 row-start-1 row-span-1 h-full object-contain opacity-50"
        v-if="imgSrc"
        :src="imgSrc"
        ref="img"
      />
      <div v-else>Paste a clip from google maps here</div>
      <svg
        @mousedown="start"
        @mousemove="update"
        @mouseup="end"
        class="col-start-1 col-span-1 row-start-1 row-span-1 z-10 w-full h-full"
      >
        <GardenFeature
          :shape="shape"
          v-for="(shape, index) in scaledShapes"
          @delete="deleteShape(index)"
          :active="selectedIndex === index || hoveredIndex === index"
          @click="selectedIndex = index"
          @update="($event) => (shapes[index] = scaleDown($event, imgWidth, imgHeight))"
        />
        <GardenFeature v-if="newShape" :shape="newShape" active />
      </svg>
    </div>
    <div class="absolute left-0 top-0 p-2 flex flex-col gap-1 text-sky-200">
      <ToolButton
        v-for="t in tools"
        @click="tool = t"
        :tool-kind="t.kind"
        :tool-name="t.name"
        :active="tool?.kind === t.kind"
      />
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
./types ./geometry
