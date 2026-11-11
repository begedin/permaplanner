import { createPinia, setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { beforeEach, expect, it } from 'vitest';
import PlotBorderLayer from './PlotBorderLayer.vue';
import { cloneGuildPath } from './guildPathClip';

const triangle = [
  { x: 10, y: 10 },
  { x: 110, y: 10 },
  { x: 110, y: 110 },
  { x: 10, y: 10 },
];
const path = [[triangle], [triangle.map((p) => ({ x: p.x + 200, y: p.y }))]];
beforeEach(() => setActivePinia(createPinia()));

it('moves a corner in map coordinates while preserving closed rings and other regions', async () => {
  const wrapper = mount(PlotBorderLayer, {
    props: { path: cloneGuildPath(path), tool: 'select', selected: true },
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.getScreenCTM = () =>
    ({ inverse: () => ({ a: 0.5, b: 0, c: 0, d: 0.5, e: -10, f: -20 }) }) as DOMMatrix;
  svg.append(wrapper.element);
  await wrapper
    .get('[aria-label="Plot border corner 5"]')
    .trigger('pointerdown', { button: 0, clientX: 640, clientY: 60 });
  document.dispatchEvent(new MouseEvent('pointerup', { clientX: 680, clientY: 80 }));
  const expected = cloneGuildPath(path);
  expected[1]![0]![1] = { x: 330, y: 20 };
  expect(wrapper.emitted('commit')).toEqual([[expected]]);
  expect(path[1]?.[0]?.[1]).toEqual({ x: 310, y: 10 });
  wrapper.unmount();
});

it('cancels a corner drag when the selection changes', async () => {
  const wrapper = mount(PlotBorderLayer, {
    props: { path, tool: 'select', selected: true },
  });
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.getScreenCTM = () =>
    ({ inverse: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }) }) as DOMMatrix;
  svg.append(wrapper.element);
  await wrapper
    .get('[aria-label="Plot border corner 1"]')
    .trigger('pointerdown', { button: 0, clientX: 20, clientY: 20 });
  await wrapper.setProps({ selected: false });
  document.dispatchEvent(new MouseEvent('pointerup', { clientX: 30, clientY: 30 }));
  expect(wrapper.emitted('commit')).toBeUndefined();
  wrapper.unmount();
});
