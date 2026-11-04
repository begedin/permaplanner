import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, h } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ToolSlider from './ToolSlider.vue';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanUndoRedoHotkeys } from './usePlanUndoRedoHotkeys';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const renderSlider = () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  const view = render(
    defineComponent({
      setup() {
        usePlanUndoRedoHotkeys();
        return () =>
          h(ToolSlider, {
            label: 'Map scale',
            value: plan.state.mapScale.linePhysicalLength,
            min: 1,
            max: 300,
            'onUpdate:value': (value: number, token: symbol) => {
              history.runMutation(() => {
                plan.state.mapScale.linePhysicalLength = value;
              }, token);
            },
          });
      },
    }),
  );
  return {
    ...view,
    plan,
    history,
    slider: screen.getByRole('slider', { name: /Map scale/ }),
  };
};

it('records keyboard changes immediately and merges fifty successive inputs', async () => {
  const { slider, plan, history } = renderSlider();
  for (let value = 2; value <= 51; value++) {
    await fireEvent.keyDown(slider, { key: 'ArrowRight' });
    await fireEvent.update(slider, String(value));
    await vi.advanceTimersByTimeAsync(100);
  }
  expect(history.canUndo).toBe(true);
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(1);
  expect(history).toMatchObject({ canUndo: false, canRedo: true });
  history.redo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(51);
});

it.each(['idle', 'blur'])(
  'starts a separate keyboard edit after %s',
  async (boundary) => {
    const { slider, plan, history } = renderSlider();
    await fireEvent.update(slider, '2');
    if (boundary === 'idle') await vi.advanceTimersByTimeAsync(501);
    else await fireEvent.blur(slider);
    await fireEvent.update(slider, '3');
    history.undo();
    expect(plan.state.mapScale.linePhysicalLength).toBe(2);
    history.undo();
    expect(plan.state.mapScale.linePhysicalLength).toBe(1);
  },
);

it('groups a long pointer drag until release and separates the next drag', async () => {
  const { slider, plan, history } = renderSlider();
  await fireEvent.pointerDown(slider);
  await fireEvent.update(slider, '10');
  await vi.advanceTimersByTimeAsync(1000);
  await fireEvent.update(slider, '20');
  await fireEvent.pointerUp(window);
  await fireEvent.pointerDown(slider);
  await fireEvent.update(slider, '30');
  await fireEvent.pointerUp(window);
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(20);
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(1);
  expect(history.canUndo).toBe(false);
});

it('supports undo and redo while the range is focused, without merging across replay', async () => {
  const { slider, plan, history } = renderSlider();
  await fireEvent.update(slider, '2');
  await fireEvent.keyDown(slider, { key: 'z', ctrlKey: true });
  expect(plan.state.mapScale.linePhysicalLength).toBe(1);
  await fireEvent.keyDown(slider, { key: 'z', ctrlKey: true, shiftKey: true });
  expect(plan.state.mapScale.linePhysicalLength).toBe(2);
  await fireEvent.update(slider, '3');
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(2);
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(1);
});

it('keeps an input undoable when unmounted before its idle timeout', async () => {
  const { slider, unmount, plan, history } = renderSlider();
  await fireEvent.update(slider, '20');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(1);
});

it('leaves text-field undo to the browser', async () => {
  const { slider, plan } = renderSlider();
  await fireEvent.update(slider, '2');
  const input = document.createElement('input');
  document.body.append(input);
  const event = new KeyboardEvent('keydown', {
    key: 'z',
    ctrlKey: true,
    bubbles: true,
    cancelable: true,
  });
  input.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(false);
  expect(plan.state.mapScale.linePhysicalLength).toBe(2);
  input.remove();
});
