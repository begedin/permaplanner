import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import type { Guild, UserPlant } from './gardenTypes';
import { DEFAULT_ONBOARDING_STATE } from './onboardingTypes';
import { snapshotPlanCommand } from './planCommand';
import {
  applyPlanSavableState,
  capturePlanSavableState,
  planSavableStatesEqual,
  type PlanSavableState,
} from './planSavableState';
import { useMapScaleStore } from './useMapScaleStore';
import { usePermaplannerStore } from './usePermaplannerStore';

beforeEach(() => {
  setActivePinia(createPinia());
});

const testPlant = (): UserPlant => ({
  id: 'p1',
  speciesId: 'comfrey',
  cultivarId: null,
});

const testGuild = (): Guild => ({
  id: 'g1',
  name: 'Bed',
  path: [{ x: 1, y: 2 }],
  plants: [],
  mulchLevel: 1,
});

const populatedSavableState = (): PlanSavableState => ({
  plants: [testPlant()],
  guilds: [testGuild()],
  backgroundOpacity: 0.55,
  backgroundImageDataUrl: 'data:image/png;base64,abc',
  syncRevision: 3,
  onboardingState: 'movingFirst',
  mapScale: {
    start: { x: 10, y: 20 },
    end: { x: 110, y: 20 },
    linePhysicalLength: 25,
  },
});

const seedStoresFromState = (state: PlanSavableState): void => {
  const permaplanner = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  permaplanner.plants = structuredClone(state.plants);
  permaplanner.guilds = structuredClone(state.guilds);
  permaplanner.backgroundOpacity = state.backgroundOpacity;
  permaplanner.backgroundImageDataUrl = state.backgroundImageDataUrl;
  permaplanner.syncRevision = state.syncRevision;
  permaplanner.onboardingState = state.onboardingState;
  Object.assign(mapScale.start, state.mapScale.start);
  Object.assign(mapScale.end, state.mapScale.end);
  mapScale.linePhysicalLength = state.mapScale.linePhysicalLength;
};

it('capturePlanSavableState deep-clones plants and guilds', () => {
  seedStoresFromState(populatedSavableState());

  const captured = capturePlanSavableState();
  captured.plants[0]!.speciesId = 'apple';
  captured.guilds[0]!.name = 'Changed';

  const permaplanner = usePermaplannerStore();
  expect(permaplanner.plants).toEqual([testPlant()]);
  expect(permaplanner.guilds).toEqual([testGuild()]);
});

it('capturePlanSavableState includes map scale and onboarding fields', () => {
  seedStoresFromState(populatedSavableState());

  expect(capturePlanSavableState()).toEqual(populatedSavableState());
});

it('applyPlanSavableState restores all savable fields', () => {
  const state = populatedSavableState();
  applyPlanSavableState(state);

  const permaplanner = usePermaplannerStore();
  const mapScale = useMapScaleStore();
  expect(permaplanner.plants).toEqual(state.plants);
  expect(permaplanner.guilds).toEqual(state.guilds);
  expect(permaplanner.backgroundOpacity).toBe(state.backgroundOpacity);
  expect(permaplanner.backgroundImageDataUrl).toBe(state.backgroundImageDataUrl);
  expect(permaplanner.syncRevision).toBe(state.syncRevision);
  expect(permaplanner.onboardingState).toBe(state.onboardingState);
  expect(mapScale.start).toEqual(state.mapScale.start);
  expect(mapScale.end).toEqual(state.mapScale.end);
  expect(mapScale.linePhysicalLength).toBe(state.mapScale.linePhysicalLength);
});

it('capture and apply round-trip empty plan state', () => {
  const before = capturePlanSavableState();
  const permaplanner = usePermaplannerStore();
  permaplanner.plants = [testPlant()];
  permaplanner.guilds = [testGuild()];
  applyPlanSavableState(before);

  expect(capturePlanSavableState()).toEqual({
    plants: [],
    guilds: [],
    backgroundOpacity: 0.4,
    backgroundImageDataUrl: undefined,
    syncRevision: 0,
    onboardingState: DEFAULT_ONBOARDING_STATE,
    mapScale: {
      start: { x: 20, y: 20 },
      end: { x: 150, y: 20 },
      linePhysicalLength: 1,
    },
  });
});

it('planSavableStatesEqual treats identical snapshots as equal', () => {
  const state = populatedSavableState();
  expect(planSavableStatesEqual(state, structuredClone(state))).toBe(true);
});

it('planSavableStatesEqual detects plant and guild changes', () => {
  const base = populatedSavableState();
  expect(
    planSavableStatesEqual(base, {
      ...base,
      plants: [{ ...testPlant(), id: 'p2' }],
    }),
  ).toBe(false);
  expect(
    planSavableStatesEqual(base, {
      ...base,
      guilds: [{ ...testGuild(), name: 'Other' }],
    }),
  ).toBe(false);
});

it('planSavableStatesEqual detects scalar and map scale changes', () => {
  const base = populatedSavableState();
  expect(planSavableStatesEqual(base, { ...base, backgroundOpacity: 0.1 })).toBe(
    false,
  );
  expect(planSavableStatesEqual(base, { ...base, syncRevision: 99 })).toBe(false);
  expect(planSavableStatesEqual(base, { ...base, onboardingState: 'done' })).toBe(
    false,
  );
  expect(
    planSavableStatesEqual(base, {
      ...base,
      mapScale: { ...base.mapScale, linePhysicalLength: 2 },
    }),
  ).toBe(false);
  expect(
    planSavableStatesEqual(base, {
      ...base,
      mapScale: {
        ...base.mapScale,
        start: { x: 11, y: 20 },
      },
    }),
  ).toBe(false);
});

it('planSavableStatesEqual compares background image by reference', () => {
  const withImage = populatedSavableState();
  expect(
    planSavableStatesEqual(withImage, {
      ...withImage,
      backgroundImageDataUrl: undefined,
    }),
  ).toBe(false);
  expect(
    planSavableStatesEqual(withImage, {
      ...withImage,
      backgroundImageDataUrl: 'data:image/png;base64,different',
    }),
  ).toBe(false);
});

it('snapshotPlanCommand do and undo swap plan state', () => {
  seedStoresFromState(populatedSavableState());
  const before = capturePlanSavableState();

  const permaplanner = usePermaplannerStore();
  permaplanner.plants = [];
  permaplanner.guilds = [];
  const after = capturePlanSavableState();

  const command = snapshotPlanCommand(before, after);
  expect(capturePlanSavableState()).toEqual(after);

  command.undo();
  expect(capturePlanSavableState()).toEqual(before);

  command.do();
  expect(capturePlanSavableState()).toEqual(after);
});
