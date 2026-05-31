<script lang="ts" setup>
  import { ICON_CANVAS } from './iconGeometry';

  defineOptions({ inheritAttrs: false });

  defineProps<{
    href: string;
  }>();
</script>
<template>
  <svg
    :viewBox="`0 0 ${ICON_CANVAS} ${ICON_CANVAS}`"
    class="block aspect-square shrink-0"
    aria-hidden="true"
    v-bind="$attrs"
  >
    <use
      :href="href"
      width="100%"
      height="100%"
    />
  </svg>
</template>
