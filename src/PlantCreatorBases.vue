<script setup lang="ts">
import { baseLayers, type BaseLayer } from './useStore';

defineProps<{ value: BaseLayer }>();
defineEmits<{ (e: 'update:value', value: BaseLayer): void }>();
</script>
<template>
  <div class="flex flex-col gap-1">
    <h3 class="text-slate-800">Base layer</h3>
    <div class="flex flew-row flex-wrap gap-1">
      <button
        v-for="layer in baseLayers"
        :key="layer"
        :title="layer"
        class="w-8 h-8 p-1 border rounded-md hover:bg-fuchsia-100"
        :class="{ 'bg-fuchsia-200': value === layer }"
        @click="$emit('update:value', layer)"
      >
        <svg class="w-full h-full">
          <use
            :xlink:href="'#' + layer"
            x="0"
            y="0"
            width="100%"
            height="100%"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
