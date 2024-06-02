<script lang="ts" setup>
import type { GardenThing, Plant } from './useGardenStore';
import MovableResizable from './MovableResizable.vue';
import PlantIcon from './PlantIcon.vue';

defineProps<{
  thing: GardenThing;
  plant: Plant;
  active: boolean;
  scale: number;
  unitLengthPx: number;
}>();

const emit = defineEmits<{
  (e: 'click' | 'delete' | 'mouseenter' | 'mouseleave'): void;
  (e: 'update', shape: GardenThing): void;
}>();
</script>
<template>
  <MovableResizable
    :active="active"
    :x="thing.x"
    :y="thing.y"
    :width="thing.width"
    :height="thing.height"
    :scale="scale"
    @update="($event) => emit('update', { ...thing, ...$event })"
  >
    <PlantIcon
      :x="thing.x"
      :y="thing.y"
      :width="thing.width"
      :height="thing.height"
      :plant="plant"
      @click.shift="$emit('delete')"
      @click.stop="emit('click')"
      @mouseenter.stop="emit('mouseenter')"
      @mouseleave.stop="emit('mouseleave')"
    />
  </MovableResizable>
  <text
    v-if="thing.width > 0 && thing.height > 0 && active"
    :x="thing.x"
    :y="thing.y + thing.height + 14"
    fill="red"
  >
    {{ `${(thing.width / unitLengthPx).toFixed(2)}x${(thing.height / unitLengthPx).toFixed(2)}` }}
  </text>
</template>
