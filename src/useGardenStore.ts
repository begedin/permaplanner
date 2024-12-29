import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, nextTick, ref } from 'vue';
import { uuid } from './utils';

export const baseLayers = [
  'bg_1',
  'bg_2',
  'bg_3',
  'bg_4',
  'bg_5',
  'bg_6',
  'bg_7',
  'bg_8',
] as const;
export type BaseLayer = (typeof baseLayers)[number];

const getPathBounds = (path: { x: number; y: number }[]) => {
  const minX = Math.min(...path.map((p) => p.x));
  const minY = Math.min(...path.map((p) => p.y));
  const maxX = Math.max(...path.map((p) => p.x));
  const maxY = Math.max(...path.map((p) => p.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

export const GuildFunction = {
  nitrogen_fixer: 'nitrogen_fixer',
  dynamic_accumulator: 'dynamic_accumulator',
  pollinator_attractor: 'pollinator_attractor',
  pest_repellent: 'pest_repellent',
  ground_cover: 'ground_cover',
  wildfire_suppressor: 'wildfire_suppressor',
  mulcher: 'mulcher',
  edible: 'edible',
  medicinal: 'medicinal',
} as const;

export type GuildFunction = (typeof GuildFunction)[keyof typeof GuildFunction];

export const GuildLayer = {
  overstory: 'overstory',
  understory: 'understory',
  shrub: 'shrub',
  ground_cover: 'ground_cover',
  vine: 'vine',
  herb: 'herb',
  root: 'root',
} as const;

export type GuildLayer = (typeof GuildLayer)[keyof typeof GuildLayer];

export type Plant = {
  id: string;
  name: string;
  background: BaseLayer;
  features: {
    feature: Feature;
    x: number;
    y: number;
    width: number;
    height: number;
  }[];
  functions: GuildFunction[];
  layers: GuildLayer[];
};

export type GardenThing = {
  id: string;
  name?: string;
  plantId: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Guild = {
  id: string;
  name: string;
  path: { x: number; y: number }[];
  plants: GardenThing[];
};

export const features = [
  'apple',
  'banana',
  'blueberry',
  'cherry',
  'lemon',
  'orange',
  'pear',
  'strawberry',
] as const;

export type Feature = (typeof features)[number];

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
  const plants = useStorage<Plant[]>('plants', []);
  const plant = ref<Plant>();

  const plantsById = computed(() =>
    Object.fromEntries(plants.value.map((p) => [p.id, p])),
  );

  const guilds = useStorage<Guild[]>('guilds', []);

  const guildBoundsById = computed(() =>
    Object.fromEntries(
      guilds.value.map((guild) => [guild.id, getPathBounds(guild.path)]),
    ),
  );

  const updateFeature = (guildId: string, thingId: string, thing: GardenThing) => {
    const guild = guilds.value.find((guild) => guild.id === guildId);
    if (!guild) {
      return;
    }

    const overlappingGuild = guilds.value.find((g) => {
      const bounds = guildBoundsById.value[g.id];
      return isOverlapping(bounds, thing);
    });

    if (overlappingGuild && overlappingGuild !== guild) {
      guild.plants = guild.plants.filter((plant) => plant.id !== thingId);
      overlappingGuild.plants.push(thing);
    } else {
      guild.plants = guild.plants.map((plant) => (plant.id === thingId ? thing : plant));
    }
  };

  const deleteFeature = (id: string) => {
    const guildById = guilds.value.find((guild) => guild.id === id);
    if (guildById) {
      guilds.value = guilds.value.filter((guild) => guild.id !== id);
    }

    const guildByPlantId = guilds.value.find((guild) =>
      guild.plants.some((plant) => plant.id === id),
    );

    if (guildByPlantId) {
      guildByPlantId.plants = guildByPlantId.plants.filter((plant) => plant.id !== id);
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
    const guild = guilds.value.find((g) => g.id === id);
    if (guild) {
      newGuild.value = undefined;
      selectedId.value = id;
      hoveredId.value = id;
    }
  };

  const removeGuild = (id: string) => {
    guilds.value = guilds.value.filter((guild) => guild.id !== id);
  };

  const getOverlappingGuild = (thing: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    return guilds.value.find((guild) =>
      isOverlapping(guildBoundsById.value[guild.id], thing),
    );
  };

  const allGardenPlants = computed(() => {
    const things: (GardenThing & { guildId: string })[] = [];
    guilds.value.forEach((guild) =>
      guild.plants.forEach((plant) => {
        things.push({ ...plant, guildId: guild.id });
      }),
    );
    return things;
  });

  const addPlantToGuild = (guildId: string, plantId: string) => {
    const guild = guilds.value.find((guild) => guild.id === guildId);
    if (!guild) {
      return;
    }
    const bounds = guildBoundsById.value[guildId];

    guild.plants.push({
      id: uuid(),
      plantId,
      x: bounds.x + 5,
      y: bounds.y + 5,
      width: 16,
      height: 16,
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
