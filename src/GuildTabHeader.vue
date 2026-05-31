<script setup lang="ts">
import { computed, ref } from 'vue';

import HighlightText from './HighlightText.vue';
import { searchInputPlaceholder } from './searchContext';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';
import { useSearchFocusHotkeys } from './useSearchFocusHotkeys';

const props = defineProps<{
  title: string;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  'update:searchQuery': [value: string];
}>();

const garden = useGardenStore();
const { selectedGuildId, clearSelection, addGuild } = useGuildSelection();
const searchInputRef = ref<HTMLInputElement | null>(null);
const searchPlaceholder = searchInputPlaceholder();

const selectedGuildName = computed(() => {
  const id = selectedGuildId.value;
  if (!id) {
    return undefined;
  }
  return garden.guilds.find((g) => g.id === id)?.name;
});

useSearchFocusHotkeys(searchInputRef, () => props.searchQuery !== undefined);
</script>

<template>
  <div
    class="flex flex-row flex-wrap items-center justify-between gap-2 shrink-0 border-b border-parchment-400/60 paper-surface px-4 py-3"
  >
    <nav
      v-if="selectedGuildId && selectedGuildName"
      aria-label="Breadcrumb"
      class="flex flex-row items-center gap-1.5 min-w-0 text-lg font-medium"
    >
      <button
        type="button"
        class="link-soft text-ink-800 hover:underline shrink-0"
        :aria-label="`Deselect guild, ${title}`"
        @click="clearSelection"
      >
        {{ title }}
      </button>
      <span
        class="text-ink-400 shrink-0"
        aria-hidden="true"
        >/</span
      >
      <span
        class="text-ink-800 truncate"
        aria-current="page"
      >
        <HighlightText
          :text="selectedGuildName"
          :query="searchQuery ?? ''"
        />
      </span>
    </nav>
    <h1
      v-else
      class="text-lg font-medium text-ink-800"
    >
      {{ title }}
    </h1>
    <label
      v-if="searchQuery !== undefined"
      class="order-last w-full min-w-0 sm:order-none sm:w-auto sm:min-w-[14rem]"
    >
      <span class="sr-only">Search guilds</span>
      <input
        ref="searchInputRef"
        type="search"
        class="w-full input-soft py-1.5 px-2 text-sm text-ink-800"
        :placeholder="searchPlaceholder"
        :value="searchQuery"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      />
    </label>
    <button
      type="button"
      class="btn-soft-primary px-3 py-1.5 text-sm shrink-0"
      @click="addGuild"
    >
      Add guild
    </button>
  </div>
</template>
