<script setup lang="ts">
  import { computed, onScopeDispose, provide, ref, watch } from 'vue';
  import { useEventListener } from '@vueuse/core';
  import { storeToRefs } from 'pinia';
  import { useRoute, useRouter } from 'vue-router';
  import { routeNames } from './router';
  import { guildLayoutKey, useGuildLayoutState } from './useGuildLayoutState';
  import GuildEditor from './GuildEditor.vue';
  import PlantSpreadEditor from './PlantSpreadEditor.vue';
  import { useFutureView } from './useFutureView';
  import GuildTabHeader from './GuildTabHeader.vue';
  import GuildListRow from './GuildListRow.vue';
  import { useGardenStore } from './useGardenStore';
  import { useGuildSearch } from './useGuildSearch';
  import { useGuildListScroll } from './useGuildListScroll';
  import { useMapInteractionStore } from './useMapInteractionStore';
  import { isInDialog } from './keyboardShortcuts';
  import { pathBounds } from './guildPathBounds';
  import { useGuildWorkspaceStore } from './useGuildWorkspaceStore';

  const router = useRouter();
  const route = useRoute();
  const garden = useGardenStore();
  const future = useFutureView();
  const interaction = useMapInteractionStore();
  const { selectedGuildId, isMerging } = storeToRefs(interaction);
  const { searchQuery, filteredGuilds, hasSearchQuery } = useGuildSearch();
  const isLayout = computed(() => route.name === routeNames.guildLayout);
  const workspace = useGuildWorkspaceStore();
  const header = ref<InstanceType<typeof GuildTabHeader>>();
  onScopeDispose(workspace.leave);
  const selectedGuild = computed(() =>
    garden.guilds.find((guild) => guild.id === selectedGuildId.value),
  );
  const selectedBounds = computed(() => {
    const path = selectedGuild.value?.path;
    return path?.length ? pathBounds(path.flat(2)) : undefined;
  });
  const selectView = (view: 'details' | 'aerial') => {
    if (view === 'details') workspace.showDetails();
    else if (isLayout.value) {
      workspace.showMap();
      void router.push({
        name: routeNames.guildsDetail,
        params: { guildId: selectedGuildId.value },
      });
    } else workspace.showMap(() => selectedBounds.value);
  };
  const { listVisible, drawerOpen } = storeToRefs(workspace);
  const listMounted = computed<boolean>((wasMounted) => wasMounted || listVisible.value);
  const { guildListScroll } = useGuildListScroll(listVisible);
  const closeGuildList = () => {
    workspace.listOpen = false;
    if (workspace.compact) header.value?.focusListToggle();
  };

  useEventListener(window, 'keydown', (event) => {
    if (event.key !== 'Escape' || !drawerOpen.value || isInDialog(event.target)) return;
    event.preventDefault();
    if (isMerging.value) interaction.resetMode();
    else closeGuildList();
  });

  watch(
    [selectedGuildId, isLayout],
    ([id, inLayout], [previousId]) => {
      workspace.listOpen = false;
      if (inLayout) workspace.showMap();
      else selectView(id && id !== previousId ? 'details' : 'aerial');
    },
    { immediate: true },
  );

  watch(
    () => interaction.selectedPlantId,
    (plantId) => {
      if (plantId) workspace.showMap();
    },
  );

  watch(searchQuery, (query) => {
    if (workspace.compact && query.trim()) workspace.listOpen = true;
  });
  const layout = useGuildLayoutState(
    computed(() => (isLayout.value ? selectedGuild.value : undefined)),
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
  const { selectedThing, selectedThingId, placingThingId } = layout;
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 bg-parchment-100/50"
    :class="{ 'guild-merge-mode': isMerging }"
  >
    <GuildTabHeader
      ref="header"
      v-model:search-query="searchQuery"
      v-model:guild-list-open="workspace.listOpen"
      :show-guild-details="workspace.detailsSelected"
      @select-view="selectView"
    />

    <div
      class="relative isolate grid flex-1 min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)] max-lg:overflow-hidden lg:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <button
        v-if="drawerOpen"
        type="button"
        tabindex="-1"
        class="absolute inset-0 z-10 bg-ink-900/25"
        aria-label="Close guild list"
        @click="closeGuildList"
      />
      <Transition
        enter-active-class="motion-safe:max-lg:transition-transform motion-safe:duration-200 ease-out"
        leave-active-class="motion-safe:max-lg:transition-transform motion-safe:duration-200 ease-in"
        enter-from-class="max-lg:-translate-x-full"
        leave-to-class="max-lg:-translate-x-full"
      >
        <aside
          v-show="listVisible"
          id="guild-list"
          class="absolute inset-y-0 left-0 z-20 flex w-full min-h-0 min-w-0 flex-col border-r border-parchment-400/60 paper-surface max-lg:shadow-parchment-lg min-[368px]:w-72 lg:static lg:z-auto lg:col-start-1 lg:row-start-1 lg:w-auto"
          :inert="!listVisible"
          :aria-hidden="listVisible ? undefined : true"
          aria-label="Guild list"
        >
          <template v-if="listMounted">
            <button
              v-if="drawerOpen && selectedGuildId"
              type="button"
              class="btn-soft m-2 mb-0 self-start px-2 py-1 text-sm"
              @click="interaction.clearSelection()"
            >
              Clear guild selection
            </button>
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
                :key="guild.id"
                :guild-id="guild.id"
                @selected="
                  closeGuildList();
                  if (isLayout) workspace.showMap();
                  else workspace.showDetails();
                "
              />
            </div>
          </template>
        </aside>
      </Transition>
      <div
        class="z-0 col-start-1 row-start-1 grid min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)] lg:col-start-2 motion-safe:lg:transition-[grid-template-columns] motion-safe:lg:duration-300 motion-safe:lg:ease-in-out"
        :class="
          selectedGuildId
            ? 'lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'
            : 'lg:grid-cols-[minmax(0,0fr)_minmax(0,5fr)]'
        "
        :inert="drawerOpen"
      >
        <section
          id="guild-details"
          class="col-start-1 row-start-1 min-h-0 min-w-0 overflow-hidden paper-surface"
          :class="{ 'max-lg:hidden': !workspace.detailsSelected || !selectedGuildId }"
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
              :placing-thing-id="placingThingId"
              class="flex-1 min-h-0"
              @select-plant="layout.selectPlant($event)"
              @place-plant="
                layout.beginPlacement($event);
                workspace.showMap();
              "
              @open-layout="
                workspace.showMap();
                if (!isLayout)
                  router.push({
                    name: routeNames.guildLayout,
                    params: { guildId: selectedGuildId },
                  });
              "
            >
              <template #plant-details>
                <PlantSpreadEditor
                  v-if="selectedThing && future.horizon !== 'now'"
                  :key="selectedThing.id"
                  :guild-id="selectedGuildId"
                  :thing="selectedThing"
                />
              </template>
            </GuildEditor>
          </div>
        </section>

        <RouterView
          id="guild-map"
          :aerial-focus="workspace.aerialFocus"
          :aria-hidden="workspace.mapVisibility === 'hidden' ? true : undefined"
          class="col-start-1 row-start-1 lg:col-start-2"
          :class="{ 'max-lg:invisible': workspace.detailsSelected && selectedGuildId }"
        />
      </div>
    </div>
  </div>
</template>
