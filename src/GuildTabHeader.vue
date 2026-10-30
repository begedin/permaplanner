<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  import UiIcon from './uiIcons/UiIcon.vue';
  import AppPageHeader from './AppPageHeader.vue';
  import HighlightText from './HighlightText.vue';
  import { searchInputPlaceholder } from './searchContext';
  import { useGardenStore } from './useGardenStore';
  import { useGuildSelection } from './useGuildSelection';
  import { usePlanCommandHistory } from './usePlanCommandHistory';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { useSearchFocusHotkeys } from './useSearchFocusHotkeys';

  const searchQuery = defineModel<string>('searchQuery', { default: '' });

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

  useSearchFocusHotkeys(searchInputRef);
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
          aria-label="Deselect guild, Guilds"
          @click="clearSelection"
        >
          Guilds
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
            :query="searchQuery"
          />
        </span>
      </nav>
      <h1
        v-else
        class="text-lg font-medium text-ink-800"
      >
        Guilds
      </h1>
    </template>
    <label class="w-56 min-w-0 shrink">
      <span class="sr-only">Search guilds</span>
      <input
        ref="searchInputRef"
        type="search"
        class="w-full input-soft py-1.5 px-2 text-sm text-ink-800"
        :placeholder="searchPlaceholder"
        v-model="searchQuery"
      />
    </label>
    <div class="flex flex-row items-center gap-1 shrink-0">
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm flex h-9 min-w-9 items-center justify-center gap-1.5 px-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canUndo"
        aria-label="Undo"
        title="Undo"
        @click="commandHistory.undo()"
      >
        <UiIcon
          name="undo"
          class="size-5"
        />
      </button>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm flex h-9 min-w-9 items-center justify-center gap-1.5 px-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canRedo"
        aria-label="Redo"
        title="Redo"
        @click="commandHistory.redo()"
      >
        <UiIcon
          name="redo"
          class="size-5"
        />
      </button>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm flex h-9 min-w-9 items-center justify-center gap-1.5 px-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        @click="addGuild"
      >
        <UiIcon
          name="add"
          class="size-5"
        />
        <span>Add guild</span>
      </button>
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm flex h-9 min-w-9 items-center justify-center gap-1.5 px-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!gardenSession.canSave"
        @click="gardenSession.save()"
      >
        <UiIcon
          name="save"
          class="size-5"
        />
        <span>{{ gardenSession.status === 'saving' ? 'Saving…' : 'Save' }}</span>
      </button>
    </div>
  </AppPageHeader>
</template>
