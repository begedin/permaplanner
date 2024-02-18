<script lang="ts" setup>
import { ref } from 'vue'
import { colors } from './colors'

defineProps<{ currentColor: `#${string}` }>()

const emit = defineEmits<{ (e: 'change', color: `#${string}`): void }>()
const open = ref(false)
</script>
<template>
  <button
    :style="{ background: currentColor }"
    class="h-8 w-8 rounded-lg"
    @click="open = !open"
  ></button>
  <div v-if="open" class="flex flex-row flex-wrap gap-1">
    <button
      v-for="color in Object.values(colors)"
      :style="{ background: color }"
      class="h-8 w-8 rounded-lg"
      @click="emit('change', color), (open = false)"
    ></button>
  </div>
</template>
