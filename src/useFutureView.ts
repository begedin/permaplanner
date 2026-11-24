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
  const projectedWidthM = (thing: GardenThing, time: Horizon = horizon.value) => {
    if (time === 'now') return;
    const profile = profiles.value.get(thing.plantId);
    const mature = thing.matureSpreadM ?? profile?.spreadM;
    if (time === 'final' || mature === undefined) return mature;
    const { pixelsPerMeter } = scale.measurement;
    if (!pixelsPerMeter || !profile?.maturityYears) return;
    const current = thing.width / pixelsPerMeter;
    const growth = mature * Math.min(1, time / profile.maturityYears);
    return Math.max(current, Math.min(mature, current + growth));
  };
  const footprint = (thing: GardenThing, time: Horizon = horizon.value) => {
    const { pixelsPerMeter } = scale.measurement;
    if (!pixelsPerMeter) return;
    const meters = projectedWidthM(thing, time);
    if (meters === undefined) return;
    const r = (meters / 2) * pixelsPerMeter;
    if (Number.isFinite(r)) return { ...canopyCircle(thing), r };
  };
  return { horizon, profiles, projectedWidthM, footprint };
});
