<script setup lang="ts">
import PlantParts from './PlantParts.vue';
import { usePlanSession } from './usePlanSession';

usePlanSession();
</script>
<template>
  <PlantParts />
  <div class="relative flex flex-col h-full">
    <div class="flex flex-row absolute top-0 left-0 w-full h-8 items-center z-10">
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 w-full text-slate-600 text-center transition-colors"
        active-class="bg-emerald-300"
        to="/guilds"
      >
        Guilds
      </RouterLink>
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 w-full text-slate-600 text-center transition-colors"
        active-class="bg-emerald-300"
        to="/aerial"
      >
        Aerial
      </RouterLink>
      <RouterLink
        class="bg-emerald-200 hover:bg-emerald-300 px-2 py-1 w-full text-slate-600 text-center transition-colors"
        active-class="bg-emerald-300"
        to="/plants"
      >
        Plants
      </RouterLink>
    </div>

    <div class="absolute top-8 left-0 bottom-0 w-full">
      <RouterView />
    </div>
  </div>
</template>
