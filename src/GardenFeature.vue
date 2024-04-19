<script lang="ts" setup>
import type { GardenThing } from './useStore'
import MovableResizable from './MovableResizable.vue'

defineProps<{ shape: GardenThing; active: boolean; scale: number }>()

const emit = defineEmits<{
  (e: 'click' | 'delete'): void
  (e: 'update', shape: GardenThing): void
}>()
</script>
<template>
  <MovableResizable
    @update="($event) => emit('update', { ...shape, ...$event })"
    :active="active"
    :x="shape.x"
    :y="shape.y"
    :width="shape.width"
    :height="shape.height"
    :scale="scale"
  >
    <use
      :xlink:href="`#${shape.bgId}`"
      @click.shift="$emit('delete')"
      @click.stop="emit('click')"
      :x="shape.x"
      :y="shape.y"
      :width="shape.width"
      :height="shape.height"
    />
    <use
      :xlink:href="`#${shape.layerId}`"
      :x="shape.x"
      :y="shape.y"
      :width="shape.width"
      :height="shape.height"
      class="pointer-events-none"
    />
  </MovableResizable>
</template>
