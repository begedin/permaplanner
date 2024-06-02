import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

const DEFAULT_START = { x: 20, y: 20 };
const DEFAULT_END = { x: 150, y: 20 };

export const useMapScaleStore = defineStore('mapScale', () => {
  const start = useStorage<{ x: number; y: number }>('mapScaleStart', DEFAULT_START);
  const end = useStorage<{ x: number; y: number }>('mapScaleEnd', DEFAULT_END);

  const linePhysicalLength = useStorage<number>('mapScaleReferenceLineRealLength', 1);

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
