<script lang="ts" setup>
import type { GardenThing, Plant } from './useStore'
import MovableResizable from './MovableResizable.vue'

defineProps<{ thing: GardenThing; plant: Plant; active: boolean; scale: number }>()

const emit = defineEmits<{
  (e: 'click' | 'delete'): void
  (e: 'update', shape: GardenThing): void
}>()
</script>
<template>
  <MovableResizable
    @update="($event) => emit('update', { ...thing, ...$event })"
    :active="active"
    :x="thing.x"
    :y="thing.y"
    :width="thing.width"
    :height="thing.height"
    :scale="scale"
  >
    <svg
      :x="thing.x"
      :y="thing.y"
      :width="thing.width"
      :height="thing.height"
      @click.shift="$emit('delete')"
      @click.stop="emit('click')"
      viewBox="0 0 100 100"
    >
      <use x="0" y="0" width="100%" height="100%" :xlink:href="`#${plant.background}`" />
      <use
        v-for="feature in plant.features"
        :key="feature.feature"
        :xlink:href="`#${feature.feature}`"
        :x="feature.x"
        :y="feature.y"
        :width="feature.width"
        :height="feature.height"
        class="pointer-events-none"
      />
    </svg>
  </MovableResizable>
</template>
