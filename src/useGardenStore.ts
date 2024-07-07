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

export type GardenBed = { id: string; path: { x: number; y: number }[] };

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
    gardenBeds.value = gardenBeds.value.filter((bed) => bed.id !== id);
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

  const gardenBeds = useStorage<GardenBed[]>('gardenBeds', []);
  const newBed = ref<GardenBed>();
  const startDrawBed = () =>
    nextTick(() => {
      newBed.value = { id: uuid(), path: [] };
      plant.value = undefined;
    });

  const editBed = (id: string) => {
    const bed = gardenBeds.value.find((b) => b.id === id);
    if (bed) {
      newBed.value = undefined;
      selectedId.value = id;
      hoveredId.value = id;
    }
  };

  const removeBed = (id: string) => {
    gardenBeds.value = gardenBeds.value.filter((bed) => bed.id !== id);
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

    gardenBeds,
    removeBed,
    newBed,
    editBed,
    startDrawBed,
  };
});
