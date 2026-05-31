<script lang="ts" setup>
import {
  formatSpeciesCounts,
  type GardenSpeciesSidebarRow,
} from './calendarGardenPlants';
import HighlightText from './HighlightText.vue';
import type { GuildPlantTooltipRow } from './guildPlantTooltips';
import PlantIcon from './PlantIcon.vue';
import PlantPhenologyCalendar from './PlantPhenologyCalendar.vue';
import type { Plant } from './gardenTypes';
import { useCalendarSelection } from './useCalendarSelection';

defineProps<{
  row: GardenSpeciesSidebarRow;
  tooltipRows: GuildPlantTooltipRow[];
  searchQuery: string;
  fillCell?: boolean;
}>();

const emit = defineEmits<{
  select: [speciesId: string];
}>();

const { selectedSpeciesId } = useCalendarSelection();

const iconPlant = (row: GardenSpeciesSidebarRow): Plant => ({
  id: row.speciesId,
  speciesId: row.speciesId,
  cultivarId: null,
  name: row.name,
  cultivar: null,
  iconId: row.iconId,
  functions: [],
  layers: [],
});
</script>

<template>
  <button
    type="button"
    class="paper-card paper-card-interactive flex flex-col gap-2 p-3 text-left w-full min-w-0"
    :class="{
      'h-full': fillCell,
      'paper-card-selected': selectedSpeciesId === row.speciesId,
    }"
    :aria-current="selectedSpeciesId === row.speciesId ? 'true' : undefined"
    :aria-label="`${row.name}, ${formatSpeciesCounts(row.cultivarCount, row.plantCount)}`"
    @click="emit('select', row.speciesId)"
  >
    <div class="flex flex-row items-center gap-2 min-w-0">
      <PlantIcon
        class="size-8 shrink-0"
        :plant="iconPlant(row)"
      />
      <div class="min-w-0 flex-1">
        <span class="block truncate text-sm font-medium text-ink-800">
          <HighlightText
            :text="row.name"
            :query="searchQuery"
          />
        </span>
        <span class="block text-[11px] text-ink-500">
          {{ formatSpeciesCounts(row.cultivarCount, row.plantCount) }}
        </span>
      </div>
    </div>
    <PlantPhenologyCalendar
      compact
      :tooltip-rows="tooltipRows"
      :show-section-label="false"
      :calendar-aria-label="`${row.name} fruit and bloom by month`"
    />
  </button>
</template>
