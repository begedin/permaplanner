import { computed } from 'vue';
import { defineStore } from 'pinia';

import { usePlanStateStore } from './usePlanStateStore';

export const useMapScaleStore = defineStore('mapScale', () => {
  const plan = usePlanStateStore();
  const start = computed({
    get: () => plan.state.mapScale.start,
    set: (value) => {
      plan.state.mapScale.start = value;
    },
  });
  const end = computed({
    get: () => plan.state.mapScale.end,
    set: (value) => {
      plan.state.mapScale.end = value;
    },
  });
  const linePhysicalLength = computed({
    get: () => plan.state.mapScale.linePhysicalLength,
    set: (value) => {
      plan.state.mapScale.linePhysicalLength = value;
    },
  });

  const line = computed(() => {
    return {
      x1: start.value.x,
      y1: start.value.y,
      x2: end.value.x,
      y2: end.value.y,
    };
  });

  const unitLengthPx = computed(() => {
    const x1 = start.value.x;
    const y1 = start.value.y;
    const x2 = end.value.x;
    const y2 = end.value.y;

    const indicatorLengthPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    return indicatorLengthPx / linePhysicalLength.value;
  });

  return {
    start,
    end,
    line,
    linePhysicalLength,
    unitLengthPx,
  };
});
