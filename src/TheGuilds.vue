<script setup lang="ts">
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

const showMobileDetail = computed(() => Boolean(selectedGuildId.value));

const closeDetail = () => {
  garden.deactivateAll();
};
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-emerald-50/40">
    <div class="flex flex-row flex-wrap items-center justify-between gap-2 shrink-0 border-b border-slate-200/80 px-4 py-3">
      <h1 class="text-lg font-medium text-slate-800">
        Guilds
      </h1>
      <button
        type="button"
        class="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 text-sm"
        @click="garden.createGuild"
      >
        Add guild
      </button>
    </div>

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
        :class="[
          showMobileDetail ? 'flex' : 'hidden md:flex',
        ]"
        aria-label="Guild details"
      >
        <div
          v-if="selectedGuildId"
          class="flex flex-col min-h-0 h-full"
        >
          <div class="flex shrink-0 items-center justify-end border-b border-slate-200/80 px-2 py-1.5 bg-white/80">
            <button
              type="button"
              class="text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded px-2 py-1"
              aria-label="Close guild details"
              @click="closeDetail"
            >
              Close
            </button>
          </div>
          <div class="flex-1 min-h-0 overflow-y-auto p-4">
            <GuildCard
              :guild-id="selectedGuildId"
              context="guilds"
            />
          </div>
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
