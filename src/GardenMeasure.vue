<script lang="ts" setup>
defineProps<{
  box: { x: number; y: number; width: number; height: number };
  unitLengthPx: number;
}>();
</script>
<template>
  <text
    v-if="box.width > 0 && box.height > 0"
    :x="box.x"
    :y="box.y + box.height + 18"
    fill="red"
  >
    {{ `${(box.width / unitLengthPx).toFixed(2)}x${(box.height / unitLengthPx).toFixed(2)}` }}
  </text>
</template>
