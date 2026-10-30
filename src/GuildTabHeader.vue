<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  import AppPageHeader from './AppPageHeader.vue';
  import HighlightText from './HighlightText.vue';
  import { searchInputPlaceholder } from './searchContext';
  import { useGardenStore } from './useGardenStore';
  import { useGuildSelection } from './useGuildSelection';
  import { usePlanCommandHistory } from './usePlanCommandHistory';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { useSearchFocusHotkeys } from './useSearchFocusHotkeys';

  const props = defineProps<{
    title: string;
    searchQuery?: string;
  }>();

  const emit = defineEmits<{
    'update:searchQuery': [value: string];
  }>();

  const garden = useGardenStore();
  const gardenSession = useGardenSessionStore();
  const { selectedGuildId, clearSelection, addGuild } = useGuildSelection();
  const commandHistory = usePlanCommandHistory();
  const { canUndo, canRedo } = storeToRefs(commandHistory);
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
  <AppPageHeader>
    <template #breadcrumb>
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
        >
          /
        </span>
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
    </template>
    <label
      v-if="searchQuery !== undefined"
      class="w-56 min-w-0 shrink"
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
    <div class="flex flex-row items-center gap-1 shrink-0">
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm px-2 py-1.5 text-sm disabled:opacity-50"
        :disabled="!canUndo"
        aria-label="Undo"
        @click="commandHistory.undo()"
      >
        Undo
      </button>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm px-2 py-1.5 text-sm disabled:opacity-50"
        :disabled="!canRedo"
        aria-label="Redo"
        @click="commandHistory.redo()"
      >
        Redo
      </button>
      <button
        type="button"
        class="btn-soft-primary px-3 py-1.5 text-sm"
        @click="addGuild"
      >
        Add guild
      </button>
      <button
        type="button"
        class="btn-soft-primary px-3 py-1.5 text-sm disabled:opacity-50"
        :disabled="!gardenSession.canSave"
        @click="gardenSession.save()"
      >
        {{ gardenSession.status === 'saving' ? 'Saving…' : 'Save' }}
      </button>
    </div>
  </AppPageHeader>
</template>
