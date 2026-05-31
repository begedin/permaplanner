import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { speciesIsPlacedInGuilds } from './calendarGardenPlants';
import { routeNames, routeParam } from './router';
import { useGardenStore } from './useGardenStore';

export const useCalendarSelection = () => {
  const route = useRoute();
  const router = useRouter();
  const garden = useGardenStore();

  const rawSpeciesId = computed(() => routeParam(route.params, 'speciesId'));

  const selectedSpeciesId = computed((): string | undefined => {
    const id = rawSpeciesId.value;
    if (!id) {
      return undefined;
    }
    return speciesIsPlacedInGuilds(garden.guilds, id, (plantId) =>
      garden.resolvedPlant(plantId),
    )
      ? id
      : undefined;
  });

  const selectedSpeciesName = computed((): string | undefined => {
    const id = selectedSpeciesId.value;
    if (!id) {
      return undefined;
    }
    for (const thing of garden.guilds.flatMap((guild) => guild.plants)) {
      const rp = garden.resolvedPlant(thing.plantId);
      if (rp.speciesId === id) {
        return rp.name;
      }
    }
    return undefined;
  });

  const selectSpecies = async (speciesId: string) => {
    if (
      !speciesIsPlacedInGuilds(garden.guilds, speciesId, (plantId) =>
        garden.resolvedPlant(plantId),
      )
    ) {
      return;
    }
    if (routeParam(route.params, 'speciesId') === speciesId) {
      return;
    }
    await router.push({ name: routeNames.calendarDetail, params: { speciesId } });
  };

  const clearSelection = async () => {
    if (rawSpeciesId.value) {
      await router.replace({ name: routeNames.calendar });
    }
  };

  const calendarTabTo = computed(() => {
    const id = selectedSpeciesId.value;
    if (id) {
      return { name: routeNames.calendarDetail, params: { speciesId: id } };
    }
    return { name: routeNames.calendar };
  });

  return {
    selectedSpeciesId,
    selectedSpeciesName,
    selectSpecies,
    clearSelection,
    calendarTabTo,
  };
};
