<script setup lang="ts">
import { computed } from 'vue';

import GuildCard from './GuildCard.vue';
import GuildTabHeader from './GuildTabHeader.vue';
import ThingBarGuild from './ThingBarGuild.vue';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';

const garden = useGardenStore();
const { selectedGuildId } = useGuildSelection();

const showMobileDetail = computed(() => Boolean(selectedGuildId.value));
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-emerald-50/40">
    <GuildTabHeader title="Guilds" />

    <div
      v-if="garden.guilds.length === 0"
      class="p-4 text-slate-600 text-sm"
    >
      No guilds yet. Click <strong>Add guild</strong> to create one.
    </div>

    <div
      v-else
      class="flex flex-1 min-h-0"
    >
      <aside
        class="flex flex-col min-h-0 min-w-0 border-r border-slate-200/80 bg-white/60 w-full md:w-72 md:shrink-0"
        :class="showMobileDetail ? 'hidden md:flex' : 'flex'"
        aria-label="Guild list"
      >
        <div class="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
          <ThingBarGuild
            v-for="guild in garden.guilds"
            :id="guild.id"
            :key="guild.id"
          />
        </div>
      </aside>

      <section
        class="flex-1 min-h-0 min-w-0 flex-col"
        :class="[showMobileDetail ? 'flex' : 'hidden md:flex']"
        aria-label="Guild details"
      >
        <div
          v-if="selectedGuildId"
          class="flex-1 min-h-0 overflow-y-auto p-4"
        >
          <GuildCard
            :guild-id="selectedGuildId"
            context="guilds"
          />
        </div>
        <p
          v-else
          class="hidden md:block p-6 text-sm text-slate-500"
        >
          Select a guild from the list to view and edit it.
        </p>
      </section>
    </div>
  </div>
</template>
