import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, nextTick, ref } from 'vue';
import { uuid } from './utils';

export const baseLayers = ['bg_1', 'bg_2', 'bg_3', 'bg_4', 'bg_5', 'bg_6', 'bg_7', 'bg_8'] as const;
export type BaseLayer = (typeof baseLayers)[number];

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
  plantIds: string[];
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

export const useGardenStore = defineStore('garden', () => {
  const plants = useStorage<Plant[]>('plants', []);
  const plant = ref<Plant>();

  const gardenThings = useStorage<GardenThing[]>('gardenThings', []);

  const deleteFeature = (id: string) => {
    gardenThings.value = gardenThings.value.filter((thing) => thing.id !== id);
    guilds.value = guilds.value.filter((guild) => guild.id !== id);
  };

  const selectedId = ref<string>();
  const hoveredId = ref<string>();

  const gardenThingsWithPlants = computed(() => {
    const data = <{ thing: GardenThing; plant: Plant }[]>[];
    gardenThings.value.forEach((thing) => {
      const plant = plants.value.find((p) => p.id === thing.plantId);
      if (plant) {
        data.push({ thing, plant });
      }
    });
    return data;
  });

  const deactivateAll = () => {
    selectedId.value = undefined;
    hoveredId.value = undefined;
  };

  const newFeature = ref<GardenThing>();

  const guilds = useStorage<Guild[]>('guilds', []);

  const guildsWithPlants = computed(() => {
    const data = <{ guild: Guild; plants: Plant[] }[]>[];
    guilds.value.forEach((guild) => {
      data.push({
        guild,
        plants: (guild.plantIds || [])
          .map((id) => plants.value.find((p) => p.id === id))
          .filter(Boolean) as Plant[],
      });
    });
    return data;
  });

  const newGuild = ref<Guild>();
  const startDrawGuild = () =>
    nextTick(() => {
      newGuild.value = { id: uuid(), name: 'New guild', path: [], plantIds: [] };
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

  return {
    plants,
    plant,
    gardenThings,
    deleteFeature,
    newFeature,

    gardenThingsWithPlants,

    deactivateAll,
    selectedId,
    hoveredId,

    guilds,
    guildsWithPlants,
    removeGuild,
    newGuild,
    editGuild,
    startDrawGuild,
  };
});
