import { defineStore, storeToRefs } from 'pinia';
import { computed, nextTick, ref } from 'vue';
import { uuid } from './utils';
import { usePermaplannerStore } from './usePermaplannerStore';
import type { GardenThing, Guild, Plant } from './gardenTypes';
import { plantCatalog } from './plantCatalog';
import { plantDisplayLabel, resolveUserPlant } from './resolvePlant';

export * from './gardenTypes';

const FALLBACK_PLANT: Plant = {
  id: '__fallback__',
  speciesId: 'unknown',
  cultivarId: null,
  name: 'Plant',
  cultivar: null,
  emoji: '🌱',
  functions: [],
  layers: [],
};

const getPathBounds = (path: { x: number; y: number }[]) => {
  const minX = Math.min(...path.map((p) => p.x));
  const minY = Math.min(...path.map((p) => p.y));
  const maxX = Math.max(...path.map((p) => p.x));
  const maxY = Math.max(...path.map((p) => p.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

type Bounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const isOverlapping = (bounds: Bounds, thing: Bounds) => {
  return (
    bounds.x <= thing.x &&
    bounds.y <= thing.y &&
    bounds.x + bounds.width >= thing.x &&
    bounds.y + bounds.height >= thing.y
  );
};

export const useGardenStore = defineStore('garden', () => {
  const permaplanner = usePermaplannerStore();
  const { plants, guilds } = storeToRefs(permaplanner);

  const plant = ref<Plant>();

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
      guilds.value.map((guild) => [guild.id, getPathBounds(guild.path)]),
    ),
  );

  const updateFeature = (guildId: string, thingId: string, thing: GardenThing) => {
    const guild = guilds.value.find((g) => g.id === guildId);
    if (!guild) {
      return;
    }

    const overlappingGuild = guilds.value.find((g) => {
      const bounds = guildBoundsById.value[g.id];
      return isOverlapping(bounds, thing);
    });

    if (overlappingGuild && overlappingGuild !== guild) {
      guild.plants = guild.plants.filter((p) => p.id !== thingId);
      overlappingGuild.plants.push(thing);
    } else {
      guild.plants = guild.plants.map((p) => (p.id === thingId ? thing : p));
    }
  };

  const deleteFeature = (id: string) => {
    const guildById = guilds.value.find((g) => g.id === id);
    if (guildById) {
      guilds.value = guilds.value.filter((g) => g.id !== id);
    }

    const guildByPlantId = guilds.value.find((g) => g.plants.some((p) => p.id === id));

    if (guildByPlantId) {
      guildByPlantId.plants = guildByPlantId.plants.filter((p) => p.id !== id);
    }
  };

  const selectedId = ref<string>();
  const hoveredId = ref<string>();

  const deactivateAll = () => {
    selectedId.value = undefined;
    hoveredId.value = undefined;
  };

  const newFeature = ref<GardenThing>();

  const newGuild = ref<Guild>();
  const startDrawGuild = () =>
    nextTick(() => {
      newGuild.value = { id: uuid(), name: 'New guild', path: [], plants: [] };
      plant.value = undefined;
    });

  const editGuild = (id: string) => {
    const g = guilds.value.find((g) => g.id === id);
    if (g) {
      newGuild.value = undefined;
      selectedId.value = id;
      hoveredId.value = id;
    }
  };

  const removeGuild = (id: string) => {
    guilds.value = guilds.value.filter((g) => g.id !== id);
  };

  const getOverlappingGuild = (thing: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    return guilds.value.find((g) => isOverlapping(guildBoundsById.value[g.id], thing));
  };

  const allGardenPlants = computed(() => {
    const things: (GardenThing & { guildId: string })[] = [];
    guilds.value.forEach((guild) =>
      guild.plants.forEach((p) => {
        things.push({ ...p, guildId: guild.id });
      }),
    );
    return things;
  });

  const addPlantToGuild = (guildId: string, plantId: string) => {
    const guild = guilds.value.find((g) => g.id === guildId);
    if (!guild) {
      return;
    }
    const bounds = guildBoundsById.value[guildId];
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

  const selectGuild = (id: string) => {
    selectedId.value = id;
    hoveredId.value = id;
    newGuild.value = undefined;
    newFeature.value = undefined;
    plant.value = undefined;
  };

  return {
    plants,
    plant,
    plantsById,
    resolvedPlant,
    deleteFeature,
    updateFeature,
    newFeature,

    deactivateAll,
    selectedId,
    hoveredId,

    guilds,

    removeGuild,
    newGuild,
    editGuild,
    startDrawGuild,

    allGardenPlants,

    addPlantToGuild,
    getOverlappingGuild,
    selectGuild,
  };
});
