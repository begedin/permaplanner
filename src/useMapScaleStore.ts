import { computed, readonly } from 'vue';
import { defineStore } from 'pinia';

import { SCALE_UNITS, type ScaleUnit } from './gardenDocument';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import type { PathPoint } from './guildPathClip';
import { onboardingAfterScaleDrag } from './onboardingTypes';

const METERS_PER_UNIT: Record<Exclude<ScaleUnit, 'unspecified'>, number> = {
  m: 1,
  cm: 0.01,
  ft: 0.3048,
  in: 0.0254,
  yd: 0.9144,
};

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

  const translateLine = (delta: PathPoint) => {
    history.runMutation(() => {
      const { start, end } = plan.state.mapScale;
      for (const point of [start, end]) {
        point.x += delta.x;
        point.y += delta.y;
      }
    });
  };

  const setPhysicalLength = (value: number, token?: symbol) => {
    history.runMutation(() => {
      plan.state.mapScale.linePhysicalLength = value;
      if (value !== 1) plan.state.onboardingState = 'done';
    }, token);
  };
  const unit = computed(() => plan.state.mapScale.unit);
  const unitLabel = computed(() => (unit.value === 'unspecified' ? 'units' : unit.value));
  const setUnit = (value: string) => {
    const selected = SCALE_UNITS.find((unit) => unit.value === value);
    if (!selected) return;
    history.runMutation(() => {
      plan.state.mapScale.unit = selected.value;
    });
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
  const measurement = computed(() => {
    const pixelsPerUnit = unitLengthPx.value;
    if (unit.value !== 'unspecified' && plan.state.onboardingState === 'done') {
      const metersPerUnit = METERS_PER_UNIT[unit.value];
      const pixelsPerMeter = pixelsPerUnit / metersPerUnit;
      if (Number.isFinite(pixelsPerMeter) && pixelsPerMeter > 0)
        return { unit: unit.value, pixelsPerUnit, pixelsPerMeter, metersPerUnit };
    }
    return {
      unit: 'map px',
      pixelsPerUnit: 1,
      pixelsPerMeter: undefined,
      metersPerUnit: undefined,
    };
  });

  return {
    unit,
    unitLabel,
    setUnit,
    movePoint,
    translateLine,
    setPhysicalLength,
    start,
    end,
    linePhysicalLength,
    unitLengthPx,
    measurement,
  };
});
