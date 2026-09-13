import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { isAerialRoute, isGuildsRoute, routeNames, routeParam } from './router';
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
    const source = garden.guilds.find((g) => g.id === garden.mergeSourceId);
    if (source) {
      if (
        source.id === id ||
        !window.confirm(
          `Merge “${source.name}” with “${target.name}”? Their areas, plants, names, and notes will be combined. You can undo this merge.`,
        )
      )
        return;
      if (!garden.mergeGuilds(source.id, id)) return;
      id = source.id;
    }
    hoveredId.value = id;
    if (isGuildsRoute(route.name)) {
      if (routeParam(route.params, 'guildId') === id) {
        return;
      }
      await router.push({ name: routeNames.guildsDetail, params: { guildId: id } });
      return;
    }
    if (isAerialRoute(route.name)) {
      if (routeParam(route.params, 'guildId') === id) {
        return;
      }
      await router.push({ name: routeNames.aerialDetail, params: { guildId: id } });
    }
  };

  const clearSelection = async () => {
    clearHover();
    if (isGuildsRoute(route.name) && rawGuildId.value) {
      await router.replace({ name: routeNames.guilds });
      return;
    }
    if (isAerialRoute(route.name) && rawGuildId.value) {
      await router.replace({ name: routeNames.aerial });
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
      return { name: routeNames.guildsDetail, params: { guildId: id } };
    }
    return { name: routeNames.guilds };
  });

  const aerialTabTo = computed(() => {
    const id = selectedGuildId.value;
    if (id) {
      return { name: routeNames.aerialDetail, params: { guildId: id } };
    }
    return { name: routeNames.aerial };
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
