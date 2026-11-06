import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMapScaleStore } from './useMapScaleStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanStateStore } from './usePlanStateStore';

beforeEach(() => setActivePinia(createPinia()));
afterEach(() => vi.restoreAllMocks());

it('prevents direct writes to scale values and nested coordinates', () => {
  const scale = useMapScaleStore();
  const plan = usePlanStateStore();
  const before = plan.capture();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  Reflect.set(scale, 'start', { x: 0, y: 0 });
  Reflect.set(scale, 'end', { x: 0, y: 0 });
  Reflect.set(scale, 'linePhysicalLength', 100);
  Reflect.set(scale.start, 'x', 0);
  Reflect.set(scale.end, 'y', 0);
  expect(plan.capture()).toEqual(before);
  expect(usePlanCommandHistory().canUndo).toBe(false);
});

it('commits physical length and completed onboarding as one undoable action', () => {
  const scale = useMapScaleStore();
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  scale.setPhysicalLength(10);
  expect(plan.state).toMatchObject({
    mapScale: { linePhysicalLength: 10 },
    onboardingState: 'done',
  });
  history.undo();
  expect(plan.state).toMatchObject({
    mapScale: { linePhysicalLength: 1 },
    onboardingState: 'initial',
  });
  expect(history.canUndo).toBe(false);
});

it('sets units without changing calibration and supports undo', () => {
  const scale = useMapScaleStore();
  const before = {
    start: { ...scale.start },
    end: { ...scale.end },
    linePhysicalLength: scale.linePhysicalLength,
  };
  scale.setUnit('ft');
  expect(scale).toMatchObject({ ...before, unit: 'ft', unitLabel: 'ft' });
  scale.setUnit('invalid');
  expect(scale.unit).toBe('ft');
  usePlanCommandHistory().undo();
  expect(scale.unit).toBe('m');
});
