<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useMediaQuery } from '@vueuse/core';
import { LayoutGroup, motion } from 'motion-v';
import { computed } from 'vue';

import {
  formatSpeciesCounts,
  guildSpeciesCounts,
  guildSpeciesTooltipRows,
  listCalendarCultivarsForSpecies,
} from './calendarGardenPlants';
import CalendarSpeciesCard from './CalendarSpeciesCard.vue';
import CalendarTabHeader from './CalendarTabHeader.vue';
import GrowthPhaseIcon from './GrowthPhaseIcon.vue';
import GuildCardSectionLabel from './GuildCardSectionLabel.vue';
import PlantIcon from './PlantIcon.vue';
import PlantPhenologyCalendar from './PlantPhenologyCalendar.vue';
import PlantVigorIcon from './PlantVigorIcon.vue';
import UiIcon from './uiIcons/UiIcon.vue';
import { phenologySummaryForPlant } from './plantCatalog';
import { useCalendarSearchStore } from './useCalendarSearchStore';
import { useCalendarSelection } from './useCalendarSelection';
import { useGardenStore } from './useGardenStore';

const calendarSidebarWidth = '20rem';

const calendarListGridStyle = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))',
};

const gardenLayoutTransition = {
  layout: { type: 'spring', stiffness: 400, damping: 38 },
} as const;

const resolveGardenPlant = (id: string) => garden.resolvedPlant(id);

const garden = useGardenStore();
const { selectedSpeciesId, selectSpecies } = useCalendarSelection();
const { searchQuery, speciesRows, filteredSpeciesRows, hasSearchQuery } = storeToRefs(
  useCalendarSearchStore(),
);

const isMdUp = useMediaQuery('(min-width: 768px)');
const showMobileDetail = computed(() => Boolean(selectedSpeciesId.value));

const selectedSpeciesRow = computed(() =>
  speciesRows.value.find((row) => row.speciesId === selectedSpeciesId.value),
);

const cultivarRows = computed(() => {
  const speciesId = selectedSpeciesId.value;
  if (!speciesId) {
    return [];
  }
  return listCalendarCultivarsForSpecies(garden.plants, speciesId, garden.guilds, (id) =>
    garden.resolvedPlant(id),
  );
});

const selectedSummaryCounts = computed(() => {
  const speciesId = selectedSpeciesId.value;
  if (!speciesId) {
    return { cultivarCount: 0, plantCount: 0 };
  }
  return guildSpeciesCounts(garden.guilds, speciesId, (id) => garden.resolvedPlant(id));
});

const detailAggregatedTooltipRows = computed(() => {
  const speciesId = selectedSpeciesId.value;
  if (!speciesId) {
    return [];
  }
  return guildSpeciesTooltipRows(garden.guilds, speciesId, resolveGardenPlant);
});

const speciesTooltipRowsById = computed(() =>
  Object.fromEntries(
    speciesRows.value.map((row) => [
      row.speciesId,
      guildSpeciesTooltipRows(garden.guilds, row.speciesId, resolveGardenPlant),
    ]),
  ),
);

const asideMotionStyle = computed((): Record<string, string> => {
  if (!isMdUp.value) {
    return {};
  }
  if (selectedSpeciesId.value) {
    return {
      flex: `0 0 ${calendarSidebarWidth}`,
      width: calendarSidebarWidth,
      maxWidth: calendarSidebarWidth,
    };
  }
  return { flex: '1 1 0%', minWidth: '0' };
});

const detailMotionStyle = computed((): Record<string, string> => {
  if (!isMdUp.value) {
    return {};
  }
  if (selectedSpeciesId.value) {
    return { flex: '1 1 0%', minWidth: '0' };
  }
  return { flex: '0 0 0%', width: '0%', minWidth: '0', overflow: 'hidden' };
});
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-parchment-100/50">
    <CalendarTabHeader v-model:search-query="searchQuery" />

    <div
      v-if="speciesRows.length === 0"
      class="p-4 text-ink-600 text-sm"
    >
      No plants in your guilds yet. Add plants on the
      <RouterLink
        class="link-soft"
        to="/guilds"
      >
        Guilds
      </RouterLink>
      tab.
    </div>

    <div
      v-else-if="filteredSpeciesRows.length === 0 && hasSearchQuery"
      class="p-4 text-ink-600 text-sm"
    >
      No plants match “{{ searchQuery.trim() }}”.
    </div>

    <div
      v-else
      class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
    >
      <LayoutGroup>
        <div class="flex flex-1 min-h-0 min-w-0">
          <motion.aside
            v-if="!showMobileDetail || isMdUp"
            layout
            layout-scroll
            :initial="false"
            :layout-dependency="selectedSpeciesId"
            :transition="gardenLayoutTransition"
            class="flex flex-col min-h-0 min-w-0 border-r border-parchment-400/60 paper-surface w-full md:shrink-0"
            :style="asideMotionStyle"
            aria-label="Garden plants"
          >
            <motion.div
              layout
              :initial="false"
              :layout-dependency="selectedSpeciesId"
              :transition="gardenLayoutTransition"
              class="calendar-list flex-1 min-h-0 overflow-y-auto p-2 grid gap-2"
              :class="
                selectedSpeciesId
                  ? 'calendar-list--single-col auto-rows-min'
                  : 'items-stretch'
              "
              :style="calendarListGridStyle"
            >
              <motion.div
                v-for="row in filteredSpeciesRows"
                :key="row.speciesId"
                layout
                :initial="false"
                class="min-w-0"
                :class="{ 'h-full': !selectedSpeciesId }"
              >
                <CalendarSpeciesCard
                  :row="row"
                  :tooltip-rows="speciesTooltipRowsById[row.speciesId] ?? []"
                  :search-query="searchQuery"
                  :fill-cell="!selectedSpeciesId"
                  @select="selectSpecies"
                />
              </motion.div>
            </motion.div>
          </motion.aside>

          <motion.section
            layout
            :initial="false"
            :layout-dependency="selectedSpeciesId"
            :transition="gardenLayoutTransition"
            class="min-h-0 min-w-0 flex-col overflow-hidden"
            :class="[showMobileDetail ? 'flex' : 'hidden md:flex']"
            :style="detailMotionStyle"
            aria-label="Plant calendar details"
          >
            <div
              v-if="selectedSpeciesId && selectedSpeciesRow"
              class="flex flex-1 min-h-0 flex-col gap-4 p-4 overflow-y-auto"
            >
              <div class="flex flex-row items-center gap-2">
                <PlantIcon
                  class="size-10 shrink-0"
                  :plant="{
                    ...selectedSpeciesRow,
                    id: selectedSpeciesRow.speciesId,
                    speciesId: selectedSpeciesRow.speciesId,
                    cultivarId: null,
                    cultivar: null,
                    functions: [],
                    layers: [],
                  }"
                />
                <div class="min-w-0">
                  <h2 class="text-lg font-medium text-ink-800 truncate">
                    {{ selectedSpeciesRow.name }}
                  </h2>
                  <p class="text-sm text-ink-500">
                    {{
                      formatSpeciesCounts(
                        selectedSummaryCounts.cultivarCount,
                        selectedSummaryCounts.plantCount,
                      )
                    }}
                    in your garden
                  </p>
                </div>
              </div>

              <PlantPhenologyCalendar
                :tooltip-rows="detailAggregatedTooltipRows"
                calendar-aria-label="Aggregated fruit and bloom by month"
              />

              <div class="flex flex-col gap-3">
                <GuildCardSectionLabel>Cultivars</GuildCardSectionLabel>
                <article
                  v-for="row in cultivarRows"
                  :key="row.userPlantId"
                  class="paper-card p-3 flex flex-col gap-2"
                  :aria-label="row.label"
                >
                  <div class="flex flex-row items-center gap-2 min-w-0">
                    <PlantIcon
                      class="size-8 shrink-0"
                      :plant="row.resolved"
                    />
                    <div class="min-w-0 flex-1 flex flex-col gap-0">
                      <span class="truncate text-sm font-medium text-ink-800">
                        {{ row.label }}
                      </span>
                      <span
                        v-if="
                          phenologySummaryForPlant(
                            row.resolved.speciesId,
                            row.resolved.cultivarId,
                          )
                        "
                        class="text-[10px] leading-tight text-ink-500"
                      >
                        {{
                          phenologySummaryForPlant(
                            row.resolved.speciesId,
                            row.resolved.cultivarId,
                          )
                        }}
                      </span>
                    </div>
                    <div
                      v-if="
                        row.headerPhaseSlots.length > 0 ||
                        row.showPhaseOverflow ||
                        row.averageVigor
                      "
                      class="flex flex-row items-center gap-0.5 shrink-0"
                      aria-label="Plant condition"
                    >
                      <GrowthPhaseIcon
                        v-for="slot in row.headerPhaseSlots"
                        :key="slot.thingId"
                        :phase="slot.phase"
                      />
                      <UiIcon
                        v-if="row.showPhaseOverflow"
                        name="ellipsis"
                        class="size-4 shrink-0 text-ink-400"
                        :title="`${row.guildInstanceCount - 8} more plants`"
                        aria-label="More plants"
                      />
                      <PlantVigorIcon
                        v-if="row.averageVigor"
                        :vigor="row.averageVigor"
                        class="ml-1"
                      />
                    </div>
                  </div>
                  <p class="text-xs text-ink-500">
                    {{ row.guildInstanceCount }}
                    {{ row.guildInstanceCount === 1 ? 'plant' : 'plants' }} in guilds
                  </p>
                  <PlantPhenologyCalendar
                    :tooltip-rows="row.tooltipRows"
                    :show-section-label="false"
                    :calendar-aria-label="`${row.label} fruit and bloom by month`"
                  />
                </article>
              </div>
            </div>
          </motion.section>
        </div>
      </LayoutGroup>
    </div>
  </div>
</template>
