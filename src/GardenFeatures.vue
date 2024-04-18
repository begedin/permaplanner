<script setup lang="ts">
import { onMounted } from 'vue'
import GardenFeature from './GardenFeature.vue'
import { useStore } from './useStore'

defineProps<{ scale: number }>()

onMounted(() => {
  document.addEventListener('keydown', (e): void => {
    if (e.key === 'Delete' && store.selectedIndex !== undefined) {
      e.preventDefault()
      e.stopPropagation()
      store.deleteFeature(store.selectedIndex)
    }
  })
})

const store = useStore()
</script>
<template>
  <GardenFeature
    :shape="shape"
    v-for="(shape, index) in store.gardenPlants"
    @delete="store.deleteFeature(index)"
    :active="store.selectedIndex === index || store.hoveredIndex === index"
    @click="store.selectedIndex = index"
    @update="($event) => (store.gardenPlants[index] = $event)"
    :scale="scale"
  />
</template>
