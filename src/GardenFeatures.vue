<script setup lang="ts">
import { onMounted } from 'vue'
import GardenFeature from './GardenFeature.vue'
import { useStore } from './useStore'

defineProps<{ scale: number }>()

onMounted(() => {
  document.addEventListener('keydown', (e): void => {
    if (e.key === 'Delete' && store.selectedId !== undefined) {
      e.preventDefault()
      e.stopPropagation()
      store.deleteFeature(store.selectedId)
    }
  })
})

const store = useStore()
</script>
<template>
  <GardenFeature
    v-for="({ thing, plant }, index) in store.gardenThingsWithPlants"
    :thing="thing"
    :plant="plant"
    @delete="store.deleteFeature(thing.id)"
    :active="store.selectedId === thing.id || store.hoveredId === thing.id"
    @click="store.selectedId = thing.id"
    @update="($event) => (store.gardenThings[index] = $event)"
    :scale="scale"
  />
</template>
