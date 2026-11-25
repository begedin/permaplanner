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
    role="meter"
    aria-valuemin="0"
    aria-valuemax="5"
    :aria-valuenow="vigor"
    :aria-valuetext="PLANT_VIGOR_LABEL[vigor]"
    :title="`Condition: ${PLANT_VIGOR_LABEL[vigor]}`"
    :aria-label="`Average condition: ${PLANT_VIGOR_LABEL[vigor]}`"
  >
    <svg
      viewBox="0 0 20 20"
      class="size-4 -rotate-90 fill-none sm:hidden"
      aria-hidden="true"
    >
      <circle
        v-for="n in 5"
        :key="n"
        cx="10"
        cy="10"
        r="7"
        pathLength="100"
        stroke-width="4"
        stroke-dasharray="17 83"
        :stroke-dashoffset="-(n - 1) * 20"
        :class="n <= vigor ? 'stroke-yellow-500' : 'stroke-parchment-300'"
      />
    </svg>
    <UiIcon
      v-for="n in 5"
      :key="n"
      :name="n <= vigor ? 'star' : 'star-outline'"
      class="hidden size-3 sm:block"
      :class="n <= vigor ? 'text-amber-500' : 'text-parchment-400'"
    />
  </span>
</template>
