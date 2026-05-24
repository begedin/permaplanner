<script lang="ts" setup>
import { computed } from 'vue';

import UiIcon from './uiIcons/UiIcon.vue';
import type { UiIconId } from './uiIcons/iconIds';

const props = defineProps<{
  count: number;
}>();

const emit = defineEmits<{
  decrement: [];
}>();

const removeIcon = computed((): UiIconId => (props.count > 1 ? 'remove-one' : 'remove'));

const removeTitle = computed(() =>
  props.count > 1 ? 'Remove one plant from bed' : 'Remove plant from bed',
);

const removeButtonClass = computed(() =>
  props.count > 1
    ? 'btn-icon bg-transparent hover:bg-amber-100 p-0.5 px-1'
    : 'btn-icon bg-transparent hover:bg-red-200 p-0.5 px-1',
);
</script>

<template>
  <button
    type="button"
    :title="removeTitle"
    :aria-label="removeTitle"
    :class="removeButtonClass"
    @click.stop="emit('decrement')"
  >
    <UiIcon :name="removeIcon" />
  </button>
</template>
