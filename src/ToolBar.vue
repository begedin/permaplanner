<script setup lang="ts">
import ToolBarButton from './ToolBarButton.vue';
import { useGardenStore } from './useGardenStore';

const garden = useGardenStore();
</script>
<template>
  <ToolBarButton
    v-for="plant in garden.plants"
    :key="plant.id"
    :plant="plant"
    :active="garden.plant?.id === plant.id"
    @click="garden.plant = plant"
  />
</template>
