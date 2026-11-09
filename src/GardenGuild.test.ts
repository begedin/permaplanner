import { enableAutoUnmount, mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import { joinPaths } from './guildPathClip';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GardenGuild from './GardenGuild.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { createMapSvg } from './testing/mapSvg';

enableAutoUnmount(afterEach);
let svg: SVGSVGElement;
afterEach(() => svg.remove());

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  svg = createMapSvg();
});

it.each([
  {
    scenario: 'moves a placed guild',
    start: { clientX: 0, clientY: 0 },
    move: { clientX: 5, clientY: 7 },
    release: { clientX: 5, clientY: 7 },
    expected: [
      { x: 5, y: 7 },
      { x: 15, y: 7 },
      { x: 15, y: 17 },
    ],
  },
  {
    scenario: 'uses the pointerdown position without requiring an earlier move',
    start: { clientX: 100, clientY: 200 },
    move: { clientX: 105, clientY: 207 },
    release: { clientX: 105, clientY: 207 },
    expected: [
      { x: 5, y: 7 },
      { x: 15, y: 7 },
      { x: 15, y: 17 },
    ],
  },
  {
    scenario: 'commits the release position when the final pointermove is skipped',
    start: { clientX: 100, clientY: 200 },
    move: undefined,
    release: { clientX: 108, clientY: 214 },
    expected: [
      { x: 8, y: 14 },
      { x: 18, y: 14 },
      { x: 18, y: 24 },
    ],
  },
])('$scenario', async ({ start, move, release, expected }) => {
  const guild = {
    id: 'guild',
    path: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ],
    plants: [],
    name: 'Bed',
    mulchLevel: 1 as const,
  };
  const wrapper = mount(GardenGuild, {
    props: { guild, unitLengthPx: 5, hovered: false, selected: true, tool: 'move' },
    attachTo: svg,
  });

  await wrapper
    .get('polygon[class*="pointer-events-fill"]')
    .trigger('pointerdown', { button: 0, ...start });
  if (move) {
    document.dispatchEvent(
      new MouseEvent('pointermove', { ...move, buttons: 1, bubbles: true }),
    );
    await nextTick();
  }
  document.dispatchEvent(new MouseEvent('pointerup', { ...release, bubbles: true }));
  await nextTick();

  expect(wrapper.emitted('move')?.at(0)).toEqual([expected]);
});

it('updates a merged area and outlines only its boundaries', async () => {
  const first = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ];
  const second = first.map(({ x, y }) => ({ x: x + 20, y }));
  const guild = reactive({
    id: 'guild',
    path: first,
    plants: [],
    name: 'A',
    mulchLevel: 1 as const,
  });
  const wrapper = mount(GardenGuild, {
    props: { guild, unitLengthPx: 5, hovered: false, selected: false },
  });
  guild.path = joinPaths(first, second);
  await nextTick();
  expect(wrapper.get('polygon').attributes('points')).toContain('30,10');
  const outline = wrapper.get('path').attributes('d');
  expect(outline).toContain('M 20,0 L 30,0');
  expect(outline).not.toContain('M 0,0 L 20,0');
  expect(outline).not.toContain('M 20,0 L 0,0');
});
