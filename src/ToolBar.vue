<script setup lang="ts">
import ToolBarButton from './ToolBarButton.vue'
import { useStore } from './useStore'

const store = useStore()
</script>
<template>
  <ToolBarButton
    v-for="plant in store.plants"
    @click="store.plant = plant"
    :plant="plant"
    :active="store.plant === plant"
  />
</template>
