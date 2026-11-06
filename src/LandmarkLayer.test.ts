import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LandmarkLayer from './LandmarkLayer.vue';
import { useLandmarkStore } from './useLandmarkStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

beforeEach(() => {
  setActivePinia(createPinia());
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, e: -10, f: -20 }) }),
  });
});
afterEach(() => vi.restoreAllMocks());

const renderLayer = () =>
  mount(
    defineComponent({
      components: { LandmarkLayer },
      setup() {
        const store = useLandmarkStore();
        const selectedId = ref(store.landmarks[0]?.id);
        const tool = ref(store.landmarks.length ? 'select' : 'landmark');
        const commit = (landmark: import('./gardenDocument').Landmark) => {
          store.save(landmark);
          selectedId.value = landmark.id;
          tool.value = 'select';
        };
        return { store, selectedId, tool, commit };
      },
      template:
        '<svg><LandmarkLayer :width="1000" :height="800" :landmarks="store.landmarks" :selected-id="selectedId" :tool="tool" @select="selectedId = $event" @commit="commit" /></svg>',
    }),
  );
const pointer = (target: EventTarget, type: string, x: number, y: number) => {
  const event = new MouseEvent(type, {
    bubbles: true,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, 'pointerId', { value: 1 });
  target.dispatchEvent(event);
};

it('draws in map coordinates, then moves, rotates and resizes with one undo step per gesture', async () => {
  const wrapper = renderLayer();
  const store = useLandmarkStore();
  const history = usePlanCommandHistory();
  pointer(
    wrapper.get('[aria-label="Draw landmark rectangle"]').element,
    'pointerdown',
    40,
    60,
  );
  pointer(document, 'pointermove', 120, 100);
  expect(store.landmarks).toEqual([]);
  pointer(document, 'pointerup', 120, 100);
  await nextTick();
  expect(store.landmarks[0]).toMatchObject({
    x: 30,
    y: 20,
    width: 40,
    height: 20,
    rotation: 0,
  });
  const original = { ...store.landmarks[0]! };

  pointer(
    wrapper.get('[aria-label="Landmark: Landmark"]').element,
    'pointerdown',
    80,
    80,
  );
  pointer(document, 'pointerup', 100, 100);
  await nextTick();
  expect(store.landmarks[0]).toMatchObject({ x: 40, y: 30, width: 40, height: 20 });

  pointer(wrapper.get('[aria-label="Rotate landmark"]').element, 'pointerdown', 100, 40);
  pointer(document, 'pointerup', 160, 100);
  await nextTick();
  expect(store.landmarks[0]?.rotation).toBeCloseTo(90);

  // At 90 degrees, the local bottom-right corner is left/below the centre.
  pointer(
    wrapper.get('[aria-label="Resize landmark bottom-right handle"]').element,
    'pointerdown',
    80,
    140,
  );
  pointer(document, 'pointerup', 60, 160);
  await nextTick();
  expect(store.landmarks[0]).toMatchObject({
    x: 35,
    y: 35,
    width: 50,
    height: expect.closeTo(30),
    rotation: 90,
  });
  history.undo();
  history.undo();
  history.undo();
  expect(store.landmarks).toEqual([original]);
  history.undo();
  expect(store.landmarks).toEqual([]);
  history.redo();
  expect(store.landmarks).toEqual([original]);
  wrapper.unmount();
});

it.each(['Escape', 'pointercancel', 'unmount', 'tool change'])(
  'discards unfinished drawing on %s',
  async (reason) => {
    const wrapper = renderLayer();
    pointer(
      wrapper.get('[aria-label="Draw landmark rectangle"]').element,
      'pointerdown',
      40,
      60,
    );
    pointer(document, 'pointermove', 120, 100);
    if (reason === 'Escape')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (reason === 'pointercancel') pointer(document, 'pointercancel', 120, 100);
    if (reason === 'unmount') wrapper.unmount();
    if (reason === 'tool change') {
      wrapper.vm.tool = 'select';
      await nextTick();
    }
    pointer(document, 'pointerup', 120, 100);
    expect(useLandmarkStore().landmarks).toEqual([]);
    expect(usePlanCommandHistory().canUndo).toBe(false);
    if (reason !== 'unmount') wrapper.unmount();
  },
);

it('clamps a dragged edge before it crosses the opposite edge and cancels a resize without saving', async () => {
  const store = useLandmarkStore();
  store.save({
    id: 'house',
    name: 'House',
    x: 100,
    y: 50,
    width: 80,
    height: 60,
    rotation: 0,
  });
  const wrapper = renderLayer();
  pointer(
    wrapper.get('[aria-label="Resize landmark left edge"]').element,
    'pointerdown',
    140,
    140,
  );
  pointer(document, 'pointerup', 540, 140);
  expect(store.landmarks[0]).toMatchObject({ x: 136.5, y: 50, width: 7, height: 60 });
  const saved = { ...store.landmarks[0]! };
  pointer(
    wrapper.get('[aria-label="Resize landmark bottom edge"]').element,
    'pointerdown',
    220,
    200,
  );
  pointer(document, 'pointermove', 220, 280);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  pointer(document, 'pointerup', 220, 280);
  expect(store.landmarks).toEqual([saved]);
  wrapper.unmount();
});
