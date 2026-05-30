import { computed, ref } from 'vue';
import { storeToRefs } from 'pinia';

import { searchGuilds } from './guildSearch';
import { useGardenStore } from './useGardenStore';

const searchQuery = ref('');

export const useGuildSearch = () => {
  const garden = useGardenStore();
  const { guilds } = storeToRefs(garden);

  const filteredGuilds = computed(() =>
    searchGuilds(guilds.value, searchQuery.value, (id) => garden.resolvedPlant(id)),
  );

  const hasSearchQuery = computed(() => searchQuery.value.trim().length > 0);

  return { searchQuery, filteredGuilds, hasSearchQuery };
};

export const resetGuildSearch = (): void => {
  searchQuery.value = '';
};
