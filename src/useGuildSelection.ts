import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { isAerialRoute, isGuildsRoute, routeNames, routeParam } from './router';
import { useGardenStore } from './useGardenStore';

export const useGuildSelection = () => {
  const route = useRoute();
  const router = useRouter();
  const garden = useGardenStore();

  const rawGuildId = computed(() => routeParam(route.params, 'guildId'));

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
    garden.hoveredId = undefined;
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
