<script lang="ts" setup>
import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';

const garden = useGardenStore();
</script>
<template>
  <div class="p-2 flex flex-col gap-2 bg-emerald-50">
    <label class="text-sm text-slate-600">Guilds</label>
    <ThingBarGuild
      v-for="guild in garden.guilds"
      :id="guild.id"
      :key="guild.id"
    />
  </div>
</template>
