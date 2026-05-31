<script lang="ts" setup>
  import { computed } from 'vue';

  import IconSquare from './icons/IconSquare.vue';
  import type { Plant } from './useGardenStore';

  defineOptions({ inheritAttrs: false });

  const props = defineProps<{
    plant: Plant;
  }>();

  const symbolHref = computed(() => `#plant-icon-${props.plant.iconId}`);
</script>
<template>
  <IconSquare
    :href="symbolHref"
    v-bind="$attrs"
  />
</template>
