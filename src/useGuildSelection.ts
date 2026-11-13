import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { isGuildsRoute, routeNames, routeParam } from './router';
import { useGardenStore } from './useGardenStore';
import { useGuildHover } from './useGuildHover';

export const useGuildSelection = () => {
  const route = useRoute();
  const router = useRouter();
  const garden = useGardenStore();
  const { hoveredId, clearHover } = useGuildHover();

  const rawGuildId = computed(() => routeParam(route.params, 'guildId'));

  const selectedGuildId = computed((): string | undefined => {
    const id = rawGuildId.value;
    if (!id) {
      return undefined;
    }
    return garden.guilds.some((g) => g.id === id) ? id : undefined;
  });

  const selectGuild = async (id: string) => {
    const target = garden.guilds.find((g) => g.id === id);
    if (!target) {
      return;
    }
    hoveredId.value = id;
    if (rawGuildId.value === id) return;

    if (isGuildsRoute(route.name)) {
      await router.push({
        name:
          route.name === routeNames.guildLayout && target.path.length
            ? routeNames.guildLayout
            : routeNames.guildsDetail,
        params: { guildId: id },
      });
    }
  };

  const clearSelection = async () => {
    clearHover();
    if (isGuildsRoute(route.name) && rawGuildId.value) {
      await router.replace({ name: routeNames.guilds });
    }
  };

  const addGuild = async () => {
    const guild = garden.createGuild();
    hoveredId.value = guild.id;
    await router.push({ name: routeNames.guildsDetail, params: { guildId: guild.id } });
  };

  const guildsTabTo = computed(() => {
    const id = selectedGuildId.value;
    if (id) {
      return {
        name:
          route.name === routeNames.guildLayout
            ? routeNames.guildLayout
            : routeNames.guildsDetail,
        params: { guildId: id },
      };
    }
    return { name: routeNames.guilds };
  });

  return {
    selectedGuildId,
    selectGuild,
    clearSelection,
    addGuild,
    guildsTabTo,
  };
};
