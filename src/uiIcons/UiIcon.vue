<script lang="ts" setup>
import { computed } from 'vue';

import IconSquare from '../icons/IconSquare.vue';
import type { UiIconId } from './iconIds';

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  name: UiIconId;
}>();

const symbolHref = computed(() => `#ui-icon-${props.name}`);
</script>
<template>
  <IconSquare
    :href="symbolHref"
    class="size-4"
    v-bind="$attrs"
  />
</template>
