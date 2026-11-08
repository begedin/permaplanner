import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { beforeEach, expect, it, vi, afterEach } from 'vitest';
import PlotBorderLayer from './PlotBorderLayer.vue';
import { usePlotBorderStore } from './usePlotBorderStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const triangle = [
  { x: 10, y: 10 },
  { x: 110, y: 10 },
  { x: 110, y: 110 },
];
const screenCorners = [
  [40, 60],
  [240, 60],
  [240, 260],
];

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
      components: { PlotBorderLayer },
      setup() {
        return { tool: ref('border'), border: usePlotBorderStore() };
      },
      template:
        '<svg><PlotBorderLayer :points="border.points" :selected="border.points.length > 0" @commit="border.save" :tool="tool" :width="1000" :height="800" /></svg>',
    }),
  );

const drawTriangle = async (wrapper: ReturnType<typeof renderLayer>) => {
  for (const [clientX, clientY] of screenCorners) {
    await wrapper
      .get('[aria-label="Draw plot border"]')
      .trigger('click', { clientX, clientY, button: 0 });
  }
};
const dragCorner = async (
  wrapper: ReturnType<typeof renderLayer>,
  corner: number,
  clientX: number,
  clientY: number,
) => {
  const [startX, startY] = screenCorners[corner - 1]!;
  await wrapper
    .get(`[aria-label="Plot border corner ${corner}"]`)
    .trigger('pointerdown', {
      button: 0,
      clientX: startX,
      clientY: startY,
      pointerId: 1,
    });
  const release = new MouseEvent('pointerup', { clientX, clientY, button: 0 });
  Object.defineProperty(release, 'pointerId', { value: 1 });
  document.dispatchEvent(release);
  await nextTick();
};

it('draws and edits in map coordinates with one undo step per commit', async () => {
  const wrapper = renderLayer();
  const border = usePlotBorderStore();
  const history = usePlanCommandHistory();
  expect(border.points).toEqual([]);
  await drawTriangle(wrapper);
  expect(border.points).toEqual([]);
  await wrapper.get('[aria-label="Close plot border"]').trigger('click');
  expect(border.points).toEqual(triangle);
  await dragCorner(wrapper, 2, 280, 80);
  expect(border.points).toEqual([triangle[0], { x: 130, y: 20 }, triangle[2]]);
  history.undo();
  expect(border.points).toEqual(triangle);
  history.undo();
  expect(border.points).toEqual([]);
  history.redo();
  expect(border.points).toEqual(triangle);
  wrapper.unmount();
});

it('requires a polygon, supports Backspace and Enter, and discards unfinished points on tool changes', async () => {
  const wrapper = renderLayer();
  const border = usePlotBorderStore();
  const surface = wrapper.get('[aria-label="Draw plot border"]');
  await surface.trigger('click', { clientX: 40, clientY: 60, button: 0 });
  await surface.trigger('click', { clientX: 240, clientY: 60, button: 0 });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(border.points).toEqual([]);
  await surface.trigger('click', { clientX: 240, clientY: 260, button: 0 });
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
  await nextTick();
  expect(wrapper.findAll('circle')).toHaveLength(2);
  wrapper.vm.tool = 'select';
  await nextTick();
  wrapper.vm.tool = 'border';
  await nextTick();
  expect(wrapper.findAll('circle')).toHaveLength(0);
  await drawTriangle(wrapper);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
  expect(border.points).toEqual(triangle);
  wrapper.unmount();
});

it('keeps the saved border and history when a corner drag collapses its area', async () => {
  const border = usePlotBorderStore();
  const history = usePlanCommandHistory();
  border.save(triangle);
  history.clear();
  const wrapper = renderLayer();
  await dragCorner(wrapper, 3, 140, 60);
  expect(border.points).toEqual(triangle);
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
  expect(wrapper.get('[aria-label="Plot border corner 3"]').attributes()).toMatchObject({
    cx: '110',
    cy: '110',
  });
  wrapper.unmount();
});
