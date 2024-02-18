<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ToolButton from './ToolButton.vue'
import { colors, type HexColor } from './colors'
import ColorPicker from './ColorPicker.vue'

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

const tools = ['circle', 'rectangle', 'line'] as const
const tool = ref<'circle' | 'rectangle' | 'line'>()

const shapes = ref<
  (
    | {
        type: 'circle'
        cx: number
        cy: number
        r: number
        color: HexColor
      }
    | {
        type: 'rectangle'
        x: number
        y: number
        width: number
        height: number
        color: HexColor
      }
    | {
        type: 'line'
        path: string
        color: HexColor
      }
  )[]
>([])

watch(
  shapes,
  () => {
    localStorage.setItem('shapes', JSON.stringify(shapes.value))
  },
  { deep: true }
)

const newCircle = ref<{ cx: number; cy: number; r: number; color: HexColor }>()
const newRectangle = ref<{ x: number; y: number; width: number; height: number; color: HexColor }>()
const newLine = ref<{ x1: number; y1: number; x2: number; y2: number; color: HexColor }>()

const getPath = (x1: number, y1: number, x2: number, y2: number) => `M ${x1} ${y1} L ${x2} ${y2}`

const start = (e: MouseEvent) => {
  if (tool.value === 'circle') {
    newCircle.value = { cx: e.offsetX, cy: e.offsetY, r: 0, color: currentColor.value }
  }

  if (tool.value === 'rectangle') {
    newRectangle.value = {
      x: e.offsetX,
      y: e.offsetY,
      width: 0,
      height: 0,
      color: currentColor.value
    }
  }

  if (tool.value === 'line') {
    newLine.value = {
      x1: e.offsetX,
      y1: e.offsetY,
      x2: e.offsetX,
      y2: e.offsetY,
      color: currentColor.value
    }
  }
}

const update = (e: MouseEvent) => {
  if (newCircle.value) {
    newCircle.value.r = Math.sqrt(
      Math.pow(e.offsetX - newCircle.value.cx, 2) + Math.pow(e.offsetY - newCircle.value.cy, 2)
    )
  }

  if (newRectangle.value) {
    newRectangle.value.width = e.offsetX - newRectangle.value.x
    newRectangle.value.height = e.offsetY - newRectangle.value.y
  }

  if (newLine.value) {
    newLine.value.x2 = e.offsetX
    newLine.value.y2 = e.offsetY
  }
}

const end = () => {
  if (newCircle.value) {
    shapes.value.push({
      type: 'circle',
      cx: newCircle.value.cx,
      cy: newCircle.value.cy,
      r: newCircle.value.r,
      color: currentColor.value
    })
    newCircle.value = undefined
  }

  if (newRectangle.value) {
    shapes.value.push({
      type: 'rectangle',
      x: newRectangle.value.x,
      y: newRectangle.value.y,
      width: newRectangle.value.width,
      height: newRectangle.value.height,
      color: currentColor.value
    })
    newRectangle.value = undefined
  }

  if (newLine.value) {
    shapes.value.push({
      type: 'line',
      path: getPath(newLine.value.x1, newLine.value.y1, newLine.value.x2, newLine.value.y2),
      color: currentColor.value
    })
    newLine.value = undefined
  }
}

const deleteShape = (index: number) => {
  shapes.value.splice(index, 1)
}

const currentColor = ref<HexColor>(colors.blueberry)
</script>

<template>
  <div class="relative flex place-items-center w-full h-full justify-center">
    <img
      class="max-w-full max-h-full object-contain flex-grow opacity-50"
      v-if="imgSrc"
      :src="imgSrc"
    />
    <div v-else>Paste a clip from google maps here</div>
    <svg class="absolute w-full h-full" @mousedown="start" @mousemove="update" @mouseup="end">
      <template v-for="(shape, index) in shapes">
        <circle
          @click.shift="deleteShape(index)"
          v-if="shape.type === 'circle'"
          :cx="shape.cx"
          :cy="shape.cy"
          :r="shape.r"
          fill="transparent"
          stroke-width="3"
          :stroke="shape.color"
        />
        <rect
          @click.shift="deleteShape(index)"
          v-if="shape.type === 'rectangle'"
          :x="shape.x"
          :y="shape.y"
          :width="shape.width"
          :height="shape.height"
          fill="transparent"
          stroke-width="3"
          :stroke="shape.color"
        />
        <path
          @click.shift="deleteShape(index)"
          v-if="shape.type === 'line'"
          :d="shape.path"
          stroke-width="3"
          :stroke="shape.color"
        />
      </template>
      <circle
        v-if="newCircle"
        :cx="newCircle.cx"
        :cy="newCircle.cy"
        :r="newCircle.r"
        fill="transparent"
        stroke-width="3"
        :stroke="currentColor"
      />
      <rect
        v-if="newRectangle"
        :x="newRectangle.x"
        :y="newRectangle.y"
        :width="newRectangle.width"
        :height="newRectangle.height"
        fill="transparent"
        stroke-width="3"
        :stroke="currentColor"
      />
      <path
        v-if="newLine"
        :d="getPath(newLine.x1, newLine.y1, newLine.x2, newLine.y2)"
        :stroke="currentColor"
        stroke-width="3"
      />
    </svg>
    <div class="absolute left-0 top-0 p-2 flex flex-col gap-1 text-sky-200">
      <ToolButton
        v-for="t in tools"
        @click="tool = t"
        :tool="t"
        :active="tool === t"
        :color="currentColor"
      />
      <ColorPicker :currentColor="currentColor" @change="currentColor = $event" />
    </div>
  </div>
</template>
