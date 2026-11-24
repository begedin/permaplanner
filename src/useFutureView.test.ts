import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';
import { useFutureView } from './useFutureView';
import { usePlanStateStore } from './usePlanStateStore';

beforeEach(() => setActivePinia(createPinia()));

const spruce = {
  id: 'tree',
  plantId: 'spruce',
  nameOrCultivar: 'Conica',
  placed: true,
  x: 2,
  y: 3,
  width: 4,
  height: 4,
};

it('uses the dwarf cultivar width and preserves an already larger canopy in year views', () => {
  const plan = usePlanStateStore().state;
  plan.onboardingState = 'done';
  plan.mapScale = {
    start: { x: 0, y: 0 },
    end: { x: 12, y: 0 },
    linePhysicalLength: 12,
    unit: 'ft',
  };
  plan.plants = [{ id: 'spruce', speciesId: 'white_spruce', cultivarId: 'conica' }];
  const future = useFutureView();
  const wide = { ...spruce, width: 8, height: 8 };
  future.horizon = 20;
  expect(future.footprint(wide)?.r).toBeCloseTo(4, 12);
  future.horizon = 'final';
  const radius = 1.25 / 0.3048 / 2;
  expect(future.footprint(wide)).toMatchObject({
    cx: 6,
    cy: 7,
    r: expect.closeTo(radius),
  });
});

it('requires a known scale and lets an unidentified plant use a nursery width in Final', () => {
  const plan = usePlanStateStore().state;
  const future = useFutureView();
  const custom = { ...spruce, matureSpreadM: 2 };
  future.horizon = 'final';
  expect(future.projectedWidthM(custom)).toBe(2);
  expect(future.footprint(custom)).toBeUndefined();
  plan.onboardingState = 'done';
  plan.mapScale.unit = 'unspecified';
  expect(future.footprint(custom)).toBeUndefined();
  plan.mapScale.unit = 'm';
  expect(future.footprint(spruce)).toBeUndefined();
  expect(future.footprint(custom)).toMatchObject({ r: 130 });
  future.horizon = 5;
  expect(future.footprint(custom)).toBeUndefined();
});

it('projects a blueberry shrub by year and uses Final for a raspberry, banana or strawberry', () => {
  const plan = usePlanStateStore().state;
  plan.onboardingState = 'done';
  plan.mapScale.unit = 'm';
  plan.plants = ['blueberry', 'raspberry', 'banana', 'strawberry'].map((id) => ({
    id,
    speciesId: id,
    cultivarId: null,
  }));
  const future = useFutureView();
  expect(future.footprint({ ...spruce, plantId: 'blueberry' }, 1)).toMatchObject({
    r: 5.25,
  });
  for (const plantId of ['raspberry', 'banana', 'strawberry']) {
    const plant = { ...spruce, plantId, matureSpreadM: 0.4 };
    expect(future.footprint(plant, 1)).toBeUndefined();
    expect(future.footprint(plant, 20)).toBeUndefined();
    expect(future.footprint(plant, 'final')).toMatchObject({ r: 26 });
  }
});
