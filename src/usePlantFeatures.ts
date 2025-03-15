import CssFilterConverter from 'css-filter-converter';

import type { ComputedRef } from 'vue';

import { computed } from 'vue';
import type { Plant } from './useGardenStore';
import { useMersenneTwister } from './useMersenneTwister';
import { assert } from './utils';

export const usePlantFeatures = (plant: ComputedRef<Plant>) => {
  const features = computed(() => {
    const feature = plant.value.feature;

    // use mersenne twister to generate 6 random sets of x,ysize values for features
    const mt = useMersenneTwister(plant.value.id);

    const size = mt.genRandomIntInRange(10, 15);

    return [
      { x: mt.genRandomIntInRange(15, 30), y: mt.genRandomIntInRange(15, 30) },
      { x: mt.genRandomIntInRange(40, 55), y: mt.genRandomIntInRange(40, 55) },
      { x: mt.genRandomIntInRange(60, 75), y: mt.genRandomIntInRange(10, 25) },
      { x: mt.genRandomIntInRange(20, 35), y: mt.genRandomIntInRange(60, 75) },
      { x: mt.genRandomIntInRange(60, 75), y: mt.genRandomIntInRange(55, 70) },
    ].map((coord) => ({
      feature,
      x: coord.x,
      y: coord.y,
      width: `${size}%`,
      height: `${size}%`,
    }));
  });

  const filter = computed(() => {
    if (!plant.value.feature_tint) {
      return undefined;
    }

    if (plant.value.feature_tint.startsWith('#')) {
      return assert(CssFilterConverter.hexToFilter(plant.value.feature_tint).color);
    }

    if (plant.value.feature_tint.startsWith('hsl')) {
      return assert(CssFilterConverter.hslToFilter(plant.value.feature_tint).color);
    }

    if (plant.value.feature_tint.startsWith('rgb')) {
      return assert(CssFilterConverter.rgbToFilter(plant.value.feature_tint).color);
    }

    return assert(CssFilterConverter.keywordToFilter(plant.value.feature_tint).color);
  });

  return { features, filter };
};
