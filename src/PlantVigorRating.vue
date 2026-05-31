<script lang="ts" setup>
  import {
    PLANT_VIGOR_LABEL,
    PLANT_VIGORS_FOR_SELECT,
    type PlantVigor,
  } from './guildPlantInstanceStatus';
  import UiIcon from './uiIcons/UiIcon.vue';

  const props = defineProps<{
    vigor?: PlantVigor;
  }>();

  const emit = defineEmits<{
    'update:vigor': [value: PlantVigor | undefined];
  }>();

  const selectVigor = (level: PlantVigor) => {
    emit('update:vigor', props.vigor === level ? undefined : level);
  };
</script>
<template>
  <span
    role="radiogroup"
    aria-label="Condition"
    class="inline-flex flex-row items-center gap-0.5"
  >
    <span
      v-for="n in PLANT_VIGORS_FOR_SELECT"
      :key="n"
      role="radio"
      :aria-checked="vigor === n"
      tabindex="0"
      class="mulch-star size-4"
      :class="
        vigor !== undefined && n <= vigor ? 'mulch-star-filled' : 'mulch-star-empty'
      "
      :aria-label="PLANT_VIGOR_LABEL[n]"
      @click.stop="selectVigor(n)"
      @keydown.enter.prevent="selectVigor(n)"
      @keydown.space.prevent="selectVigor(n)"
    >
      <UiIcon
        :name="vigor !== undefined && n <= vigor ? 'star' : 'star-outline'"
        class="size-full"
      />
    </span>
  </span>
</template>
