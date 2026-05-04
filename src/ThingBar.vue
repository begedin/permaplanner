<script lang="ts" setup>
import { computed } from 'vue';

import GuildCard from './GuildCard.vue';
import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';

const garden = useGardenStore();

const selectedGuildId = computed(() => {
  const id = garden.selectedId;
  if (!id) {
    return undefined;
  }
  return garden.guilds.some((g) => g.id === id) ? id : undefined;
});
</script>
<template>
  <div class="p-2 flex flex-col gap-3 bg-emerald-50 min-h-0">
    <section class="flex flex-col gap-1.5 shrink-0">
      <h2 class="text-sm font-medium text-slate-800">
        Selected guild
      </h2>
      <GuildCard
        v-if="selectedGuildId"
        :guild-id="selectedGuildId"
        context="guilds"
      />
      <p
        v-else
        class="text-xs text-slate-500"
      >
        Click a guild in the list or on the map to edit it here.
      </p>
    </section>

    <section class="flex flex-col gap-2 min-h-0">
      <h2 class="text-sm text-slate-600">
        All guilds
      </h2>
      <div class="flex flex-col gap-2">
        <ThingBarGuild
          v-for="guild in garden.guilds"
          :id="guild.id"
          :key="guild.id"
        />
      </div>
    </section>
  </div>
</template>
