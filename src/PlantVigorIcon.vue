<script lang="ts" setup>
import { PLANT_VIGOR_LABEL, type PlantVigor } from './guildPlantInstanceStatus';
import UiIcon from './uiIcons/UiIcon.vue';

defineProps<{
  vigor: PlantVigor;
}>();
</script>
<template>
  <span
    class="inline-flex items-center gap-px shrink-0"
    :title="`Condition: ${PLANT_VIGOR_LABEL[vigor]}`"
    :aria-label="`Average condition: ${PLANT_VIGOR_LABEL[vigor]}`"
  >
    <UiIcon
      v-for="n in 5"
      :key="n"
      :name="n <= vigor ? 'star' : 'star-outline'"
      class="size-3"
      :class="n <= vigor ? 'text-amber-500' : 'text-parchment-400'"
    />
  </span>
</template>
