import { storeToRefs } from 'pinia';

import type { Guild, UserPlant } from './gardenTypes';
import type { OnboardingState } from './onboardingTypes';
import { useMapScaleStore } from './useMapScaleStore';
import { usePermaplannerStore } from './usePermaplannerStore';

export type PlanSavableState = {
  plants: UserPlant[];
  guilds: Guild[];
  backgroundOpacity: number;
  backgroundImageDataUrl: string | undefined;
  syncRevision: number;
  onboardingState: OnboardingState;
  mapScale: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    linePhysicalLength: number;
  };
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const mapScalePointsEqual = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): boolean => a.x === b.x && a.y === b.y;

export const capturePlanSavableState = (): PlanSavableState => {
  const permaplanner = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  const { start, end, linePhysicalLength } = storeToRefs(mapScale);
  return {
    plants: clone(permaplanner.plants),
    guilds: clone(permaplanner.guilds),
    backgroundOpacity: permaplanner.backgroundOpacity,
    backgroundImageDataUrl: permaplanner.backgroundImageDataUrl,
    syncRevision: permaplanner.syncRevision,
    onboardingState: permaplanner.onboardingState,
    mapScale: {
      start: { x: start.value.x, y: start.value.y },
      end: { x: end.value.x, y: end.value.y },
      linePhysicalLength: linePhysicalLength.value,
    },
  };
};

export const applyPlanSavableState = (state: PlanSavableState): void => {
  const permaplanner = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  const { start, end, linePhysicalLength } = storeToRefs(mapScale);
  permaplanner.plants = clone(state.plants);
  permaplanner.guilds = clone(state.guilds);
  permaplanner.backgroundOpacity = state.backgroundOpacity;
  permaplanner.backgroundImageDataUrl = state.backgroundImageDataUrl;
  permaplanner.syncRevision = state.syncRevision;
  permaplanner.onboardingState = state.onboardingState;
  start.value.x = state.mapScale.start.x;
  start.value.y = state.mapScale.start.y;
  end.value.x = state.mapScale.end.x;
  end.value.y = state.mapScale.end.y;
  linePhysicalLength.value = state.mapScale.linePhysicalLength;
};

export const planSavableStatesEqual = (
  a: PlanSavableState,
  b: PlanSavableState,
): boolean => {
  if (a.backgroundImageDataUrl !== b.backgroundImageDataUrl) {
    return false;
  }
  if (
    a.backgroundOpacity !== b.backgroundOpacity ||
    a.syncRevision !== b.syncRevision ||
    a.onboardingState !== b.onboardingState ||
    a.mapScale.linePhysicalLength !== b.mapScale.linePhysicalLength ||
    !mapScalePointsEqual(a.mapScale.start, b.mapScale.start) ||
    !mapScalePointsEqual(a.mapScale.end, b.mapScale.end)
  ) {
    return false;
  }
  return (
    JSON.stringify(a.plants) === JSON.stringify(b.plants) &&
    JSON.stringify(a.guilds) === JSON.stringify(b.guilds)
  );
};
