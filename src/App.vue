<script setup lang="ts">
import AppFooter from './AppFooter.vue';
import PlantParts from './PlantParts.vue';
import { usePlanSession } from './usePlanSession';

usePlanSession();
</script>
<template>
  <PlantParts />
  <div class="flex flex-col h-full min-h-0">
    <nav class="flex flex-row h-8 shrink-0 items-center z-10">
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
    </nav>

    <div class="flex-1 min-h-0 overflow-auto w-full">
      <RouterView />
    </div>

    <AppFooter />
  </div>
</template>
