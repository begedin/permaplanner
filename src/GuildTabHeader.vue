<script setup lang="ts">
import { computed } from 'vue';

import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';

defineProps<{
  title: string;
}>();

const garden = useGardenStore();
const { selectedGuildId, clearSelection, addGuild } = useGuildSelection();

const selectedGuildName = computed(() => {
  const id = selectedGuildId.value;
  if (!id) {
    return undefined;
  }
  return garden.guilds.find((g) => g.id === id)?.name;
});
</script>

<template>
  <div
    class="flex flex-row flex-wrap items-center justify-between gap-2 shrink-0 border-b border-slate-200/80 px-4 py-3"
  >
    <nav
      v-if="selectedGuildId && selectedGuildName"
      aria-label="Breadcrumb"
      class="flex flex-row items-center gap-1.5 min-w-0 text-lg font-medium"
    >
      <button
        type="button"
        class="text-slate-800 hover:text-slate-950 shrink-0"
        :aria-label="`Deselect guild, ${title}`"
        @click="clearSelection"
      >
        {{ title }}
      </button>
      <span
        class="text-slate-400 shrink-0"
        aria-hidden="true"
        >/</span
      >
      <span
        class="text-slate-800 truncate"
        aria-current="page"
        >{{ selectedGuildName }}</span
      >
    </nav>
    <h1
      v-else
      class="text-lg font-medium text-slate-800"
    >
      {{ title }}
    </h1>
    <button
      type="button"
      class="bg-green-600 hover:bg-green-700 text-white rounded px-3 py-1.5 text-sm shrink-0"
      @click="addGuild"
    >
      Add guild
    </button>
  </div>
</template>
