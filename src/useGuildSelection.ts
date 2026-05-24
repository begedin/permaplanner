import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { isRestoringSession } from './usePlanSession';
import { useGardenStore } from './useGardenStore';

const isGuildsPath = (path: string) => path === '/guilds' || path.startsWith('/guilds/');
export const isAerialPath = (path: string) =>
  path === '/aerial' || path === '/garden' || path.startsWith('/aerial/');

const guildIdFromParams = (route: ReturnType<typeof useRoute>): string | undefined => {
  const p = route.params.guildId;
  if (typeof p === 'string' && p.length > 0) {
    return p;
  }
  return undefined;
};

const routeGuildId = (route: ReturnType<typeof useRoute>): string | undefined => {
  if (isGuildsPath(route.path) || isAerialPath(route.path)) {
    return guildIdFromParams(route);
  }
  return undefined;
};

export const useGuildSelection = () => {
  const route = useRoute();
  const router = useRouter();
  const garden = useGardenStore();

  const rawGuildId = computed(() => routeGuildId(route));

  const selectedGuildId = computed((): string | undefined => {
    const id = rawGuildId.value;
    if (!id) {
      return undefined;
    }
    return garden.guilds.some((g) => g.id === id) ? id : undefined;
  });

  const selectGuild = async (id: string) => {
    if (!garden.guilds.some((g) => g.id === id)) {
      return;
    }
    garden.hoveredId = id;
    if (isGuildsPath(route.path)) {
      if (route.params.guildId === id) {
        return;
      }
      await router.push({ name: 'guilds-detail', params: { guildId: id } });
      return;
    }
    if (isAerialPath(route.path)) {
      if (route.params.guildId === id) {
        return;
      }
      await router.push({ name: 'aerial-detail', params: { guildId: id } });
    }
  };

  const clearSelection = async () => {
    garden.hoveredId = undefined;
    if (isGuildsPath(route.path) && rawGuildId.value) {
      await router.replace({ name: 'guilds' });
      return;
    }
    if (isAerialPath(route.path) && rawGuildId.value) {
      await router.replace({ name: 'aerial' });
    }
  };

  const addGuild = async () => {
    const guild = garden.createGuild();
    await router.push({ name: 'guilds-detail', params: { guildId: guild.id } });
  };

  const guildsTabTo = computed(() => {
    const id = selectedGuildId.value;
    if (id) {
      return { name: 'guilds-detail' as const, params: { guildId: id } };
    }
    return { name: 'guilds' as const };
  });

  const aerialTabTo = computed(() => {
    const id = selectedGuildId.value;
    if (id) {
      return { name: 'aerial-detail' as const, params: { guildId: id } };
    }
    return { name: 'aerial' as const };
  });

  watchEffect(() => {
    if (isRestoringSession.value) {
      return;
    }
    if (rawGuildId.value && !selectedGuildId.value) {
      void clearSelection();
    }
  });

  return {
    selectedGuildId,
    selectGuild,
    clearSelection,
    addGuild,
    guildsTabTo,
    aerialTabTo,
  };
};
