<script lang="ts" setup>
import type { GardenThing, Plant } from './useStore'
import MovableResizable from './MovableResizable.vue'
import PlantIcon from './PlantIcon.vue'

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
    <PlantIcon
      :x="thing.x"
      :y="thing.y"
      :width="thing.width"
      :height="thing.height"
      :plant="plant"
      @click.shift="$emit('delete')"
      @click.stop="emit('click')"
    />
  </MovableResizable>
</template>
