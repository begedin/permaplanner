import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { usePlanCommandHistory } from './usePlanCommandHistory';
import { planSavableStatesEqual, type PlanSavableState } from './planSavableState';
import { useMapScaleStore } from './useMapScaleStore';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanStateStore } from './usePlanStateStore';

beforeEach(() => setActivePinia(createPinia()));

const populatedState: PlanSavableState = {
  landmarks: [],
  plotBorder: [],
  plants: [{ id: 'p1', speciesId: 'comfrey', cultivarId: null }],
  guilds: [
    { id: 'g1', name: 'Bed', path: [[[{ x: 1, y: 2 }]]], plants: [], mulchLevel: 1 },
  ],
  backgroundOpacity: 0.55,
  backgroundImageDataUrl: 'data:image/png;base64,abc',
  onboardingState: 'movingFirst',
  mapScale: {
    unit: 'm',
    start: { x: 10, y: 20 },
    end: { x: 110, y: 20 },
    linePhysicalLength: 25,
  },
};

it('captures all editable fields without retaining nested references', () => {
  const plan = usePlanStateStore();
  Object.assign(plan.state, structuredClone(populatedState));
  const captured = plan.capture();
  expect(captured).toEqual(populatedState);
  captured.plants[0]!.speciesId = 'apple';
  captured.guilds[0]!.name = 'Changed';
  captured.mapScale.start.x = 99;
  expect(plan.state).toEqual(populatedState);
});

it('restores populated and empty state through both store views, preserving server revision', () => {
  const plan = usePlanStateStore();
  const empty = plan.capture();
  const permaplanner = usePermaplannerStore();
  const scale = useMapScaleStore();
  permaplanner.setSyncRevision(12);
  plan.restore(populatedState);
  const { mapScale, ...fields } = populatedState;
  expect(permaplanner).toMatchObject({ ...fields, syncRevision: 12 });
  expect(scale).toMatchObject(mapScale);

  plan.restore(empty);
  expect(plan.capture()).toEqual(empty);
  expect(permaplanner.syncRevision).toBe(12);
});

it.each<[string, (state: PlanSavableState) => void]>([
  [
    'plant',
    (state) => {
      state.plants[0]!.id = 'p2';
    },
  ],
  [
    'guild',
    (state) => {
      state.guilds[0]!.name = 'Other';
    },
  ],
  [
    'opacity',
    (state) => {
      state.backgroundOpacity = 0.1;
    },
  ],
  [
    'onboarding',
    (state) => {
      state.onboardingState = 'done';
    },
  ],
  [
    'scale length',
    (state) => {
      state.mapScale.linePhysicalLength = 2;
    },
  ],
  [
    'scale point',
    (state) => {
      state.mapScale.start.x = 11;
    },
  ],
  [
    'removed image',
    (state) => {
      state.backgroundImageDataUrl = undefined;
    },
  ],
  [
    'replaced image',
    (state) => {
      state.backgroundImageDataUrl = 'data:image/png;base64,different';
    },
  ],
])('detects a changed %s', (_name, change) => {
  const changed = structuredClone(populatedState);
  change(changed);
  expect(planSavableStatesEqual(populatedState, changed)).toBe(false);
});

it('compares identical values independently of object key order', () => {
  const state = structuredClone(populatedState);
  expect(planSavableStatesEqual(populatedState, state)).toBe(true);
  state.mapScale = {
    unit: state.mapScale.unit,
    linePhysicalLength: state.mapScale.linePhysicalLength,
    end: { y: state.mapScale.end.y, x: state.mapScale.end.x },
    start: { y: state.mapScale.start.y, x: state.mapScale.start.x },
  };
  expect(planSavableStatesEqual(populatedState, state)).toBe(true);
});

it('commitSnapshot records an edit and undo/redo restores complete plan snapshots', () => {
  const plan = usePlanStateStore();
  Object.assign(plan.state, structuredClone(populatedState));
  const before = plan.capture();
  plan.state.plants = [];
  plan.state.guilds = [];
  const after = plan.capture();

  const history = usePlanCommandHistory();
  history.commitSnapshot(before);
  expect(plan.capture()).toEqual(after);
  history.undo();
  expect(plan.capture()).toEqual(before);
  history.redo();
  expect(plan.capture()).toEqual(after);
});
