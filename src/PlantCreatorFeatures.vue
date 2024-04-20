<script setup lang="ts">
import { features, type Feature } from './useStore'

defineProps<{ value: Feature }>()
</script>
<template>
  <div class="flex flex-col gap-1">
    <h3 class="text-slate-800">Feature</h3>
    <div class="flex flew-row flex-wrap gap-1">
      <button
        :title="feature"
        :key="feature"
        class="w-8 h-8 p-1 border rounded-md hover:bg-fuchsia-100"
        :class="{ 'bg-fuchsia-200': value === feature }"
        v-for="feature in features"
        @click="$emit('update:value', feature)"
      >
        <svg class="w-full h-full">
          <use :xlink:href="'#' + feature" x="0" y="0" width="100%" height="100%" />
        </svg>
      </button>
    </div>
  </div>
</template>
