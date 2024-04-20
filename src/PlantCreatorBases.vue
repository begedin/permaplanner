<script setup lang="ts">
import { baseLayers, type BaseLayer } from './useStore'

defineProps<{ value: BaseLayer }>()
</script>
<template>
  <div class="flex flex-col gap-1">
    <h3 class="text-slate-800">Base layer</h3>
    <div class="flex flew-row flex-wrap gap-1">
      <button
        :title="layer"
        :key="layer"
        class="w-8 h-8 p-1 border rounded-md hover:bg-fuchsia-100"
        :class="{ 'bg-fuchsia-200': value === layer }"
        v-for="layer in baseLayers"
        @click="$emit('update:value', layer)"
      >
        <svg class="w-full h-full">
          <use :xlink:href="'#' + layer" x="0" y="0" width="100%" height="100%" />
        </svg>
      </button>
    </div>
  </div>
</template>
