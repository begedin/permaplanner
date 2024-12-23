<script setup lang="ts">
import PlantParts from './PlantParts.vue';
</script>
<template>
  <PlantParts />
  <div class="flex flex-col h-screen">
    <div class="flex flex-row">
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 w-full text-slate-600 text-center transition-colors"
        active-class="bg-emerald-300"
        to="/"
      >
        Garden
      </RouterLink>
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 w-full text-slate-600 text-center transition-colors"
        active-class="bg-emerald-300"
        to="/plants"
      >
        Plants
      </RouterLink>
    </div>
    <div class="flex-1">
      <RouterView />
    </div>
  </div>
</template>
