import { rectangleLandmarkPath } from './landmarkGeometry';
import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import LandmarkLayer from './LandmarkLayer.vue';
import { useLandmarkStore } from './useLandmarkStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const landmark = {
  id: 'shed',
  name: 'Shed',
  x: 30,
  y: 20,
  width: 40,
  height: 20,
  rotation: 0,
  path: rectangleLandmarkPath(),
};

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
        const controlsTarget = ref<SVGGElement>();
        const tool = ref('select');
        const commit = (landmark: import('./gardenDocument').Landmark) => {
          store.save(landmark);
          selectedId.value = landmark.id;
          tool.value = 'select';
        };
        return { store, selectedId, tool, commit, controlsTarget };
      },
      template:
        '<svg><LandmarkLayer :landmarks="store.landmarks" :selected-id="selectedId" :tool="tool" :controls-target="controlsTarget" @select="selectedId = $event" @commit="commit" /><g ref="controlsTarget" role="group" aria-label="Landmark controls" /></svg>',
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

it('moves, rotates and resizes with one undo step per gesture', async () => {
  const store = useLandmarkStore();
  store.save(landmark);
  const wrapper = renderLayer();
  const history = usePlanCommandHistory();
  const original = { ...store.landmarks[0]! };

  pointer(wrapper.get('[aria-label="Landmark: Shed"]').element, 'pointerdown', 80, 80);
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

it('does not move a landmark when selection changes the map layout during a click', async () => {
  const store = useLandmarkStore();
  store.save(landmark);
  const wrapper = renderLayer();
  let matrix = { a: 0.5, b: 0, c: 0, d: 0.5, e: -10, f: -20 };
  Object.defineProperty(wrapper.get('svg').element, 'getScreenCTM', {
    value: () => ({ inverse: () => matrix }),
  });

  pointer(wrapper.get('[aria-label="Landmark: Shed"]').element, 'pointerdown', 80, 80);
  // Opening or closing the sidebar changes both the SVG scale and its screen offset.
  matrix = { a: 0.25, b: 0, c: 0, d: 0.25, e: -30, f: -10 };
  pointer(document, 'pointerup', 80, 80);
  await nextTick();
  expect(store.landmarks).toEqual([landmark]);

  pointer(wrapper.get('[aria-label="Landmark: Shed"]').element, 'pointerdown', 80, 80);
  matrix = { a: 0.5, b: 0, c: 0, d: 0.5, e: -10, f: -20 };
  pointer(document, 'pointerup', 120, 100);
  await nextTick();
  expect(store.landmarks).toEqual([{ ...landmark, x: 40, y: 25 }]);
  usePlanCommandHistory().undo();
  expect(store.landmarks).toEqual([landmark]);
  wrapper.unmount();
});

it('rotates through the controls overlay when another landmark covers the handle', async () => {
  const store = useLandmarkStore();
  const selected = { ...landmark, x: 100, y: 100 };
  const overlapping = {
    ...selected,
    id: 'house',
    name: 'House',
    y: 62,
    width: 60,
    height: 60,
  };
  store.save(selected);
  store.save(overlapping);
  const wrapper = renderLayer();
  await nextTick();
  const handle = wrapper
    .get('[aria-label="Landmark controls"]')
    .get('[aria-label="Rotate landmark"]');

  pointer(handle.element, 'pointerdown', 220, 164);
  pointer(document, 'pointerup', 296, 240);
  await nextTick();

  expect(store.landmarks).toEqual([
    { ...selected, rotation: expect.closeTo(90) },
    overlapping,
  ]);
  usePlanCommandHistory().undo();
  expect(store.landmarks).toEqual([selected, overlapping]);
  wrapper.unmount();
});

it.each(['Escape', 'pointercancel', 'unmount', 'tool change'])(
  'discards unfinished moves on %s',
  async (reason) => {
    useLandmarkStore().save(landmark);
    const wrapper = renderLayer();
    pointer(wrapper.get('[aria-label="Landmark: Shed"]').element, 'pointerdown', 40, 60);
    pointer(document, 'pointermove', 120, 100);
    if (reason === 'Escape')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    if (reason === 'pointercancel') pointer(document, 'pointercancel', 120, 100);
    if (reason === 'unmount') wrapper.unmount();
    if (reason === 'tool change') {
      wrapper.vm.tool = 'draw';
      await nextTick();
    }
    pointer(document, 'pointerup', 120, 100);
    expect(useLandmarkStore().landmarks).toEqual([landmark]);
    if (reason !== 'unmount') wrapper.unmount();
  },
);

it('clamps a dragged edge before it crosses the opposite edge and cancels a resize without saving', async () => {
  const store = useLandmarkStore();
  store.save({
    ...landmark,
    id: 'house',
    name: 'House',
    x: 100,
    y: 50,
    width: 80,
    height: 60,
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
