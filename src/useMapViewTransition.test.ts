import { effectScope, nextTick, ref } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useMapViewTransition } from './useMapViewTransition';

const media = vi.hoisted(() => ({ reduced: false }));
vi.mock('@vueuse/core', async () => {
  const { ref } = await import('vue');
  return { useMediaQuery: () => ref(media.reduced) };
});
let frame: FrameRequestCallback | undefined;
let now = 0;
let scope: ReturnType<typeof effectScope>;
beforeEach(() => {
  media.reduced = false;
  now = 0;
  frame = undefined;
  scope = effectScope();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frame = callback;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {
    frame = undefined;
  });
});
afterEach(() => {
  scope.stop();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
const aerial = { x: 0, y: 0, width: 1000, height: 600 };
const closeup = { x: 100, y: 200, width: 100, height: 60 };

it('animates route changes, retargets interrupted motion, and restores the aerial bounds', async () => {
  const target = ref(aerial);
  const view = ref<string>();
  const transition = scope.run(() => useMapViewTransition(target, view))!;
  target.value = closeup;
  view.value = 'bed';
  await nextTick();
  expect(transition.transitioning.value).toBe(true);
  now = 240;
  frame?.(now);
  const intermediate = transition.bounds.value;
  expect(intermediate.width).toBeGreaterThan(closeup.width);
  expect(intermediate.width).toBeLessThan(aerial.width);
  target.value = aerial;
  view.value = undefined;
  await nextTick();
  expect(transition.bounds.value).toEqual(intermediate);
  now += 480;
  frame?.(now);
  expect(transition.bounds.value).toEqual(aerial);
  expect(transition.transitioning.value).toBe(false);

  target.value = { ...aerial, x: 20 };
  await nextTick();
  expect(transition.bounds.value).toEqual(target.value);
  expect(frame).toBeUndefined();
});

it('uses final bounds immediately with reduced motion and on direct layout entry', async () => {
  media.reduced = true;
  const target = ref(closeup);
  const view = ref<string | undefined>('bed');
  const transition = scope.run(() => useMapViewTransition(target, view))!;
  expect(transition.bounds.value).toEqual(closeup);
  target.value = aerial;
  view.value = undefined;
  await nextTick();
  expect(transition.bounds.value).toEqual(aerial);
  expect(frame).toBeUndefined();
});

it('retargets changed geometry during motion and cancels the frame on disposal', async () => {
  const target = ref(aerial);
  const view = ref<string>();
  const transition = scope.run(() => useMapViewTransition(target, view))!;
  target.value = closeup;
  view.value = 'bed';
  await nextTick();
  now = 100;
  frame?.(now);
  target.value = { ...closeup, width: 150 };
  await nextTick();
  now += 480;
  frame?.(now);
  expect(transition.bounds.value).toEqual(target.value);
  view.value = 'other';
  await nextTick();
  scope.stop();
  expect(frame).toBeUndefined();
  expect(transition.transitioning.value).toBe(false);
});
