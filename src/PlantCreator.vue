<script setup lang="ts">
import { computed, ref } from 'vue'
import { v4 as uuidV4 } from 'uuid'
import { useStore, type BgId, type LayerId, type Plant, bgIds, layerIds } from './useStore'
import { idText } from 'typescript'

const bgId = ref<BgId>('bg_1')
const layerId = ref<LayerId>('layer_apple')

const open = ref(false)

const name = ref('')

const size = 300

const store = useStore()

const id = ref(uuidV4())

const save = () => {
  if (name.value === '') {
    return
  }

  const plant = store.plants.find((p) => p.id === id.value)
  if (plant) {
    plant.name = name.value
    plant.bgId = bgId.value
    plant.layerId = layerId.value
  } else {
    store.plants.push({
      id: id.value,
      name: name.value,
      bgId: bgId.value,
      layerId: layerId.value,
    })
  }

  open.value = false
}

const edit = (plant: Plant) => {
  id.value = plant.id
  name.value = plant.name
  bgId.value = plant.bgId
  layerId.value = plant.layerId
}

const remove = (plant: Plant) => {
  store.plants = store.plants.filter((p) => p.id !== plant.id)
  store.gardenPlants = store.gardenPlants.filter((p) => p.id !== plant.id)
}

const isNew = computed(() => store.plants.findIndex((p) => p.id === id.value) === -1)
</script>
<template>
  <button @click="open = true" class="bg-emerald-200 px-2 py-1 w-full text-slate-600 rounded-md">
    Plant Creator
  </button>
  <div
    v-if="open"
    class="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 flex place-content-center place-items-center"
    @click.self="open = false"
  >
    <div class="bg-white p-4 grid grid-flow-col gap-8 rounded-md">
      <div class="flex flex-col gap-1">
        <button
          v-for="plant in store.plants"
          :key="plant.name"
          @click="edit(plant)"
          class="flex flex-row items-center gap-1 bg-slate-200 rounded-md p-1 hover:bg-slate-300 text-slate-900"
          :class="{ 'bg-slate-400': plant.name === name }"
        >
          <svg height="20" width="20" viewBox="0 0 20 20">
            <use :xlink:href="'#' + plant.bgId" width="100%" height="100%" />
            <use :xlink:href="'#' + plant.layerId" width="100%" height="100%" />
          </svg>
          {{ plant.name }}
          <button @click.self="remove(plant)" class="bg-red-200 hover:bg-red-300 p-1 rounded-md">
            🗑️
          </button>
        </button>
        <button
          @click="edit({ id: uuidV4(), name: '', bgId: 'bg_1', layerId: 'layer_apple' })"
          class="flex flex-row items-center gap-1 bg-slate-200 rounded-md p-1 hover:bg-slate-300 text-slate-900"
          :class="{ 'bg-slate-400': isNew }"
        >
          <svg height="20" width="20" viewBox="0 0 20 20">
            <use :xlink:href="'#' + bgId" width="100%" height="100%" />
            <use :xlink:href="'#' + layerId" width="100%" height="100%" />
          </svg>
          {{ isNew ? name || 'New' : 'New' }}
        </button>
      </div>
      <div>
        <svg :height="size" :width="size" :viewBox="`0 0 ${size} ${size}`">
          <use :xlink:href="'#' + bgId" :width="size" :height="size" />
          <use :xlink:href="'#' + layerId" :width="size" :height="size" />
        </svg>
      </div>
      <div class="flex flex-col gap-2 p-2">
        <label class="flex flex-col gap-1 items-center">
          <span class="text-slate-800">Background</span>
          <div class="flex flex-row gap-2 min-w-40 justify-between text-slate-500">
            <button
              @click="bgId = bgIds[bgIds.indexOf(bgId) - 1] || bgIds.slice(-1)[0]"
              class="border rounded-md"
            >
              ◀
            </button>
            {{ bgId }}
            <button
              @click="bgId = bgIds[bgIds.indexOf(bgId) + 1] || bgIds[0]"
              class="border rounded-md"
            >
              ▶
            </button>
          </div>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-slate-800">Foreground</span>
          <div class="flex flex-row gap-2 min-w-40 justify-between text-slate-500">
            <button
              @click="layerId = layerIds[layerIds.indexOf(layerId) - 1] || layerIds.slice(-1)[0]"
              class="border rounded-md"
            >
              ◀
            </button>
            {{ layerId }}
            <button
              @click="layerId = layerIds[layerIds.indexOf(layerId) + 1] || layerIds[0]"
              class="border rounded-md"
            >
              ▶
            </button>
          </div>
        </label>
        <label class="flex flex-col gap-1">
          <span class="text-slate-800">Name</span>
          <input v-model="name" class="p-1 border border-slate-300 rounded-md" />
        </label>
        <button
          @click="save"
          class="px-2 py-1 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-600"
        >
          Create
        </button>
      </div>
    </div>
  </div>
</template>
