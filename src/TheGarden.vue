<script setup lang="ts">
  import { computed, provide, watch } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useRoute, useRouter } from 'vue-router';
  import { routeNames } from './router';
  import { guildLayoutKey, useGuildLayoutState } from './useGuildLayoutState';
  import GuildEditor from './GuildEditor.vue';
  import GuildTabHeader from './GuildTabHeader.vue';
  import GuildListRow from './GuildListRow.vue';
  import { useGardenStore } from './useGardenStore';
  import { useGuildSearch } from './useGuildSearch';
  import { useGuildListScroll } from './useGuildListScroll';
  import { useMapInteractionStore } from './useMapInteractionStore';

  const router = useRouter();
  const route = useRoute();
  const garden = useGardenStore();
  const { selectedGuildId, isMerging } = storeToRefs(useMapInteractionStore());
  const { searchQuery, filteredGuilds, hasSearchQuery } = useGuildSearch();
  const { guildListScroll } = useGuildListScroll();
  const isLayout = computed(() => route.name === routeNames.guildLayout);
  const layout = useGuildLayoutState(
    computed(() =>
      isLayout.value
        ? garden.guilds.find((guild) => guild.id === selectedGuildId.value)
        : undefined,
    ),
  );
  watch(
    () => isLayout.value && !layout.guild.value?.path.length,
    (invalid) => {
      if (invalid)
        void router.replace(
          selectedGuildId.value
            ? {
                name: routeNames.guildsDetail,
                params: { guildId: selectedGuildId.value },
              }
            : { name: routeNames.guilds },
        );
    },
  );
  provide(guildLayoutKey, layout);
  const { selectedThingId } = layout;
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 bg-parchment-100/50"
    :class="{ 'guild-merge-mode': isMerging }"
  >
    <GuildTabHeader v-model:search-query="searchQuery" />

    <div class="flex flex-col md:flex-row flex-1 min-h-0 min-w-0">
      <aside
        class="flex flex-col min-h-0 min-w-0 max-h-40 md:max-h-none md:w-72 md:shrink-0 border-r border-parchment-400/60 paper-surface"
        aria-label="Guild list"
      >
        <div
          v-if="garden.guilds.length === 0"
          class="p-4 text-ink-600 text-sm"
        >
          No guilds yet. Click <strong>Add guild</strong> to create one.
        </div>
        <div
          v-else-if="filteredGuilds.length === 0 && hasSearchQuery"
          class="p-4 text-ink-600 text-sm"
        >
          No guilds match “{{ searchQuery.trim() }}”.
        </div>
        <div
          v-else
          ref="guildListScroll"
          class="guild-list flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-2 flex flex-col gap-2"
        >
          <GuildListRow
            v-for="guild in filteredGuilds"
            :guild-id="guild.id"
            :key="guild.id"
          />
        </div>
      </aside>
      <div
        class="guild-workspace grid flex-1 min-h-0 min-w-0"
        :class="{ 'guild-workspace--selected': selectedGuildId }"
      >
        <section
          class="min-h-0 min-w-0 overflow-hidden paper-surface"
          :aria-hidden="!selectedGuildId"
          :inert="!selectedGuildId"
          aria-label="Guild details"
        >
          <div
            class="flex h-full min-h-0 min-w-0 flex-col border-r border-parchment-400/60 p-2"
          >
            <GuildEditor
              v-if="selectedGuildId"
              :key="selectedGuildId"
              :guild-id="selectedGuildId"
              :layout-mode="isLayout"
              :selected-thing-id="selectedThingId"
              @select-plant="layout.selectPlant($event)"
              @place-plant="layout.beginPlacement($event)"
              @open-layout="
                router.push({
                  name: routeNames.guildLayout,
                  params: { guildId: selectedGuildId },
                })
              "
              class="flex-1 min-h-0"
            />
          </div>
        </section>

        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
  .guild-workspace {
    grid-template-rows: minmax(0, 0fr) minmax(0, 1fr);
    transition:
      grid-template-columns 300ms ease-in-out,
      grid-template-rows 300ms ease-in-out;
  }

  .guild-workspace--selected {
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  @media (min-width: 768px) {
    .guild-workspace {
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 0fr) minmax(0, 5fr);
    }

    .guild-workspace--selected {
      grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guild-workspace {
      transition: none;
    }
  }
</style>
