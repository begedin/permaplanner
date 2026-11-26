<script setup lang="ts">
  import { useRoute } from 'vue-router';
  import { routeNames } from './router';
  import { computed, ref } from 'vue';
  import { storeToRefs } from 'pinia';

  import UiIcon from './uiIcons/UiIcon.vue';
  import AppPageHeader from './AppPageHeader.vue';
  import HighlightText from './HighlightText.vue';
  import { searchInputPlaceholder } from './searchContext';
  import { useGardenStore } from './useGardenStore';
  import { useMapInteractionStore } from './useMapInteractionStore';
  import { usePlanCommandHistory } from './usePlanCommandHistory';
  import GardenSaveButton from './GardenSaveButton.vue';
  import { useSearchFocusHotkeys } from './useSearchFocusHotkeys';

  const searchQuery = defineModel<string>('searchQuery', { default: '' });
  const guildListOpen = defineModel<boolean>('guildListOpen', { default: false });
  const props = defineProps<{ showGuildDetails?: boolean }>();
  const emit = defineEmits<{ selectView: [view: 'details' | 'aerial'] }>();

  const route = useRoute();
  const isLayout = computed(() => route.name === routeNames.guildLayout);
  const garden = useGardenStore();
  const interaction = useMapInteractionStore();
  const { selectedGuildId } = storeToRefs(interaction);
  const { clearSelection, addGuild } = interaction;
  const commandHistory = usePlanCommandHistory();
  const { canUndo, canRedo } = storeToRefs(commandHistory);
  const searchInputRef = ref<HTMLInputElement | null>(null);
  const listToggle = ref<HTMLButtonElement>();
  defineExpose({
    focusListToggle: () => listToggle.value?.focus({ preventScroll: true }),
  });
  const searchPlaceholder = searchInputPlaceholder();
  const views = [
    { id: 'details', label: 'Details', icon: 'edit', controls: 'guild-details' },
    { id: 'aerial', label: 'Aerial', icon: 'guilds', controls: 'guild-map' },
  ] as const;
  const activeView = computed(() => {
    if (guildListOpen.value) return undefined;
    if (props.showGuildDetails) return 'details';
    return isLayout.value ? undefined : 'aerial';
  });
  const selectView = (view: 'details' | 'aerial') => {
    guildListOpen.value = false;
    emit('selectView', view);
  };

  const selectedGuildName = computed(() => {
    const id = selectedGuildId.value;
    if (!id) {
      return undefined;
    }
    return garden.guilds.find((g) => g.id === id)?.name.trim() || 'Unnamed guild';
  });

  useSearchFocusHotkeys(searchInputRef);
</script>

<template>
  <AppPageHeader>
    <template #menu>
      <button
        id="guild-list-toggle"
        ref="listToggle"
        type="button"
        class="nav-icon-btn lg:hidden"
        :class="{ 'nav-icon-btn-active': guildListOpen }"
        aria-label="Guild list"
        title="Guild list"
        aria-controls="guild-list"
        :aria-expanded="guildListOpen"
        @click="guildListOpen = !guildListOpen"
      >
        <UiIcon
          name="list"
          class="size-5"
        />
      </button>
    </template>
    <template #breadcrumb>
      <template v-if="selectedGuildId && selectedGuildName">
        <nav
          aria-label="Breadcrumb"
          class="hidden lg:flex flex-row items-center gap-1.5 min-w-0 text-lg font-medium"
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
          <RouterLink
            v-if="isLayout"
            class="link-soft truncate text-ink-800 hover:underline"
            :to="{ name: routeNames.guildsDetail, params: { guildId: selectedGuildId } }"
          >
            <HighlightText
              :text="selectedGuildName"
              :query="searchQuery"
            />
          </RouterLink>
          <span
            v-else
            class="text-ink-800 truncate"
            aria-current="page"
          >
            <HighlightText
              :text="selectedGuildName"
              :query="searchQuery"
            />
          </span>
          <template v-if="isLayout">
            <span
              class="text-ink-400 shrink-0"
              aria-hidden="true"
              >/</span
            >
            <span
              class="text-ink-800 shrink-0"
              aria-current="page"
              >Plant layout</span
            >
          </template>
        </nav>
        <nav
          class="flex items-center gap-1 border-t border-parchment-300 pt-1.5 lg:hidden"
          aria-label="Guild views"
        >
          <span
            class="mr-auto min-w-0 truncate font-serif font-medium text-ink-800"
            :title="selectedGuildName"
            >{{ selectedGuildName }}</span
          >
          <button
            v-for="view in views"
            :key="view.id"
            type="button"
            class="nav-icon-btn h-8 w-auto shrink-0 gap-1 rounded-sm px-2"
            :class="{ 'nav-icon-btn-active': activeView === view.id }"
            :aria-pressed="activeView === view.id"
            :aria-controls="view.controls"
            :title="view.label"
            @click="selectView(view.id)"
          >
            <UiIcon :name="view.icon" />
            <span class="sr-only min-[360px]:not-sr-only">{{ view.label }}</span>
          </button>
        </nav>
      </template>
      <h1
        v-else
        class="text-lg font-medium text-ink-800"
      >
        Guilds
      </h1>
    </template>
    <label class="w-full min-w-0 lg:w-56">
      <span class="sr-only">Search guilds</span>
      <input
        ref="searchInputRef"
        v-model="searchQuery"
        type="search"
        class="w-full input-soft py-1.5 px-2 text-sm text-ink-800"
        :placeholder="searchPlaceholder"
      />
    </label>
    <div
      class="grid shrink-0 grid-cols-4 gap-1 min-[368px]:flex"
      role="group"
      aria-label="Guild actions"
    >
      <button
        type="button"
        class="btn-soft-muted btn-soft-sm flex h-9 min-w-9 items-center justify-center gap-0.5 whitespace-nowrap px-0.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed min-[368px]:gap-1.5 min-[368px]:px-2"
        @click="addGuild"
      >
        <UiIcon
          name="add"
          class="size-5"
        />
        <span class="sr-only min-[360px]:not-sr-only">Add guild</span>
      </button>
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
      <GardenSaveButton />
    </div>
  </AppPageHeader>
</template>
