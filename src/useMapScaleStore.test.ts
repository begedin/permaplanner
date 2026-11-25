import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import RecoverMapFeatures from './RecoverMapFeatures.vue';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMapScaleStore } from './useMapScaleStore';
import { useCameraStore } from './useCameraStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanStateStore } from './usePlanStateStore';

beforeEach(() => setActivePinia(createPinia()));
afterEach(cleanup);
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

it.each([
  { action: 'Reference line', startX: -300, endX: -200, dx: 300, dy: 0 },
  { action: 'Reference line end', startX: 100, endX: 1500, dx: -1300, dy: -70 },
  { action: 'Reference line start', startX: -900, endX: 500, dx: 1100, dy: 70 },
])(
  'recovers $action in one step and preserves calibration',
  async ({ action, startX, endX, dx, dy }) => {
    useCameraStore().$patch({ x: 100, y: 100, width: 200, height: 200 });
    const scale = useMapScaleStore();
    const start = { x: startX, y: 130 };
    const end = { x: endX, y: 270 };
    scale.movePoint('start', start);
    scale.movePoint('end', end);
    scale.setPhysicalLength(10);
    const history = usePlanCommandHistory();
    history.clear();
    const measurement = { ...scale.measurement };
    render(RecoverMapFeatures);
    await fireEvent.click(screen.getByRole('button', { name: action }));
    expect(scale).toMatchObject({
      start: { x: start.x + dx, y: start.y + dy },
      end: { x: end.x + dx, y: end.y + dy },
      measurement,
    });
    expect(screen.queryByRole('button', { name: action })).not.toBeInTheDocument();
    history.undo();
    expect(scale).toMatchObject({ start, end, measurement });
    expect(history.canUndo).toBe(false);
  },
);
