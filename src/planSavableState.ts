import type { GardenDocument } from './gardenDocument';
import { DEFAULT_ONBOARDING_STATE } from './onboardingTypes';

export type PlanSavableState = Omit<
  GardenDocument,
  'version' | 'syncRevision' | 'backgroundImage'
> & { backgroundImageDataUrl: string | undefined };

export const createEmptyPlanState = (): PlanSavableState => ({
  plants: [],
  guilds: [],
  backgroundOpacity: 0.4,
  backgroundImageDataUrl: undefined,
  onboardingState: DEFAULT_ONBOARDING_STATE,
  mapScale: {
    start: { x: 20, y: 20 },
    end: { x: 150, y: 20 },
    linePhysicalLength: 1,
  },
});

/** Clone JSON plan data without serializing the potentially large image string. */
export const clonePlanState = (state: PlanSavableState): PlanSavableState => {
  const { backgroundImageDataUrl, ...data } = state;
  return { ...JSON.parse(JSON.stringify(data)), backgroundImageDataUrl };
};

const equalValues = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((value, index) => equalValues(value, b[index]))
    );
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  // Optional fields set to undefined are omitted by JSON persistence.
  const keys = Object.keys(left).filter((key) => left[key] !== undefined);
  return (
    keys.length === Object.keys(right).filter((key) => right[key] !== undefined).length &&
    keys.every((key) => Object.hasOwn(right, key) && equalValues(left[key], right[key]))
  );
};

export const planSavableStatesEqual = (
  a: PlanSavableState,
  b: PlanSavableState,
): boolean => equalValues(a, b);
