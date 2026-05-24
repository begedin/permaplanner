import { defineStore, storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { uuid } from './utils';
import { usePermaplannerStore } from './usePermaplannerStore';
import type { Guild, Plant } from './gardenTypes';
import { plantCatalog } from './plantCatalog';
import { confirmGuildDeletion } from './confirmGuildDeletion';
import { pathBounds } from './guildPathBounds';
import { plantDisplayLabel, resolveUserPlant } from './resolvePlant';

export * from './gardenTypes';

const FALLBACK_PLANT: Plant = {
  id: '__fallback__',
  speciesId: 'unknown',
  cultivarId: null,
  name: 'Plant',
  cultivar: null,
  iconId: 'seedling',
  functions: [],
  layers: [],
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const useGardenStore = defineStore('garden', () => {
  const permaplanner = usePermaplannerStore();
  const { plants, guilds } = storeToRefs(permaplanner);

  const plantsById = computed(() => {
    const m: Record<string, Plant> = {};
    for (const up of plants.value) {
      m[up.id] = resolveUserPlant(up, plantCatalog);
    }
    return m;
  });

  const resolvedPlant = (id: string): Plant => plantsById.value[id] ?? FALLBACK_PLANT;

  const guildBoundsById = computed(() =>
    Object.fromEntries(
      guilds.value
        .filter((g) => g.path.length > 0)
        .map((guild) => [guild.id, pathBounds(guild.path)]),
    ),
  );

  const deleteFeature = (id: string) => {
    if (guilds.value.some((g) => g.id === id)) {
      removeGuild(id);
      return;
    }

    const guildByPlantId = guilds.value.find((g) => g.plants.some((p) => p.id === id));

    if (guildByPlantId) {
      guildByPlantId.plants = guildByPlantId.plants.filter((p) => p.id !== id);
    }
  };

  const hoveredId = ref<string>();

  const deactivateAll = () => {
    hoveredId.value = undefined;
  };

  const createGuild = (): Guild => {
    const g: Guild = {
      id: uuid(),
      name: 'New guild',
      path: [],
      plants: [],
      mulchLevel: 1,
    };
    guilds.value.push(g);
    hoveredId.value = g.id;
    return g;
  };

  const removeGuild = (id: string) => {
    const guild = guilds.value.find((g) => g.id === id);
    if (!guild || !confirmGuildDeletion(guild.name)) {
      return;
    }
    guilds.value = guilds.value.filter((g) => g.id !== id);
    if (hoveredId.value === id) {
      hoveredId.value = undefined;
    }
  };

  /** Clears the guild bed on the aerial map; keeps the guild and its plants. */
  const removeGuildFromAerialMap = (id: string) => {
    const g = guilds.value.find((guild) => guild.id === id);
    if (g) {
      g.path = [];
    }
  };

  const addPlantToGuild = (guildId: string, plantId: string) => {
    const guild = guilds.value.find((g) => g.id === guildId);
    if (!guild) {
      return;
    }
    const bounds =
      guildBoundsById.value[guildId] ??
      ({ x: 0, y: 0, width: 64, height: 64 } satisfies Bounds);
    const rp = resolvedPlant(plantId);

    guild.plants.push({
      id: uuid(),
      plantId,
      x: bounds.x + 5,
      y: bounds.y + 5,
      width: 16,
      height: 16,
      nameOrCultivar: plantDisplayLabel(rp),
    });
  };

  return {
    plants,
    plantsById,
    resolvedPlant,
    deleteFeature,

    deactivateAll,
    hoveredId,

    guilds,

    removeGuild,
    removeGuildFromAerialMap,
    createGuild,

    addPlantToGuild,
  };
});
