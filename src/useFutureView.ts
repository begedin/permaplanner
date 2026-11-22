import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { canopyCircle, type GardenThing } from './gardenTypes';
import { getCultivar, getSpecies } from './plantCatalog';
import { useGardenStore } from './useGardenStore';
import { useMapScaleStore } from './useMapScaleStore';

export const FUTURE_HORIZONS = [
  'now',
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  15,
  20,
  'final',
] as const;
type Horizon = (typeof FUTURE_HORIZONS)[number];

export const useFutureView = defineStore('futureView', () => {
  const horizon = ref<Horizon>('now');
  const scale = useMapScaleStore();
  const garden = useGardenStore();
  const profiles = computed(
    () =>
      new Map(
        garden.plants.map((plant) => {
          const species = getSpecies(plant.speciesId);
          const cultivar =
            species && plant.cultivarId
              ? getCultivar(species, plant.cultivarId)
              : undefined;
          return [plant.id, cultivar?.growth ?? species?.growth];
        }),
      ),
  );
  const footprint = (thing: GardenThing, time: Horizon = horizon.value) => {
    const { pixelsPerMeter } = scale.measurement;
    if (time === 'now' || !pixelsPerMeter) return;
    const profile = profiles.value.get(thing.plantId);
    const meters = thing.matureSpreadM ?? profile?.spreadM;
    if (!meters) return;
    const mature = meters * pixelsPerMeter;
    let diameter = mature;
    if (time !== 'final') {
      if (!profile?.maturityYears) return;
      const growth = (mature * time) / profile.maturityYears;
      diameter = Math.max(thing.width, Math.min(mature, thing.width + growth));
    }
    return { ...canopyCircle(thing), r: diameter / 2 };
  };
  return { horizon, profiles, footprint };
});
