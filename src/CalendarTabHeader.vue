<script setup lang="ts">
  import { ref } from 'vue';

  import AppPageHeader from './AppPageHeader.vue';
  import HighlightText from './HighlightText.vue';
  import { searchInputPlaceholder } from './searchContext';
  import { useCalendarSelection } from './useCalendarSelection';
  import { useSearchFocusHotkeys } from './useSearchFocusHotkeys';

  defineProps<{
    searchQuery: string;
  }>();

  const emit = defineEmits<{
    'update:searchQuery': [value: string];
  }>();

  const { selectedSpeciesId, selectedSpeciesName, clearSelection } =
    useCalendarSelection();
  const searchInputRef = ref<HTMLInputElement | null>(null);
  const searchPlaceholder = searchInputPlaceholder();

  useSearchFocusHotkeys(searchInputRef, () => true);
</script>

<template>
  <AppPageHeader>
    <template #breadcrumb>
      <nav
        v-if="selectedSpeciesId && selectedSpeciesName"
        aria-label="Breadcrumb"
        class="flex flex-row items-center gap-1.5 min-w-0 text-lg font-medium"
      >
        <button
          type="button"
          class="link-soft text-ink-800 hover:underline shrink-0"
          aria-label="Deselect plant, Calendar"
          @click="clearSelection"
        >
          Calendar
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
            :text="selectedSpeciesName"
            :query="searchQuery"
          />
        </span>
      </nav>
      <h1
        v-else
        class="text-lg font-medium text-ink-800"
      >
        Calendar
      </h1>
    </template>
    <label class="w-56 min-w-0 shrink">
      <span class="sr-only">Search garden plants</span>
      <input
        ref="searchInputRef"
        type="search"
        class="w-full input-soft py-1.5 px-2 text-sm text-ink-800"
        :placeholder="searchPlaceholder"
        :value="searchQuery"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      />
    </label>
  </AppPageHeader>
</template>
