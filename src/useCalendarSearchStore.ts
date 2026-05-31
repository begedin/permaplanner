import { defineStore, storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import { listGardenSpecies } from './calendarGardenPlants';
import { searchGardenSpecies } from './calendarSearch';
import { useGardenStore } from './useGardenStore';

export const useCalendarSearchStore = defineStore('calendarSearch', () => {
  const garden = useGardenStore();
  const { guilds } = storeToRefs(garden);
  const searchQuery = ref('');

  const speciesRows = computed(() =>
    listGardenSpecies(guilds.value, (id) => garden.resolvedPlant(id)),
  );

  const filteredSpeciesRows = computed(() =>
    searchGardenSpecies(speciesRows.value, searchQuery.value),
  );

  const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0);

  return { searchQuery, speciesRows, filteredSpeciesRows, hasSearchQuery };
});
