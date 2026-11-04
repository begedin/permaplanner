import { computed, readonly } from 'vue';
import { defineStore } from 'pinia';

import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { onboardingAfterScaleDrag } from './onboardingTypes';

export const useMapScaleStore = defineStore('mapScale', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();

  const movePoint = (endpoint: 'start' | 'end', point: { x: number; y: number }) => {
    const current = plan.state.mapScale[endpoint];
    if (current.x === point.x && current.y === point.y) return;
    history.runMutation(() => {
      plan.state.mapScale[endpoint] = { ...point };
      plan.state.onboardingState = onboardingAfterScaleDrag(plan.state.onboardingState);
    });
  };

  const setPhysicalLength = (value: number, token?: symbol) => {
    history.runMutation(() => {
      plan.state.mapScale.linePhysicalLength = value;
      if (value !== 1) plan.state.onboardingState = 'done';
    }, token);
  };
  const start = computed(() => readonly(plan.state.mapScale.start));
  const end = computed(() => readonly(plan.state.mapScale.end));
  const linePhysicalLength = computed(() => plan.state.mapScale.linePhysicalLength);

  const unitLengthPx = computed(() => {
    const x1 = start.value.x;
    const y1 = start.value.y;
    const x2 = end.value.x;
    const y2 = end.value.y;

    const indicatorLengthPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    return indicatorLengthPx / linePhysicalLength.value;
  });

  return {
    movePoint,
    setPhysicalLength,
    start,
    end,
    linePhysicalLength,
    unitLengthPx,
  };
});
