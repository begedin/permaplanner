import { enableAutoUnmount, mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import { joinPaths } from './guildPathClip';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GardenGuild from './GardenGuild.vue';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { useSceneStore } from './useSceneStore';
import * as svgClientToUser from './svgClientToUser';

enableAutoUnmount(afterEach);

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

it('draws a bed', async () => {
  const scene = useSceneStore();
  scene.x = 3;
  scene.y = 4;
  scene.isDrawing = false;

  const wrapper = mount(GardenGuild, {
    props: {
      guild: { id: 'guild', path: [], plants: [], name: 'A guild', mulchLevel: 1 },
      unitLengthPx: 5,
      hovered: false,
      selected: false,
    },
    attachTo: document.body,
  });

  await wrapper.setProps({ selected: true, tool: 'edit' });

  scene.isDrawing = true;
  await wrapper.vm.$nextTick();

  scene.x = 5;
  scene.y = 6;
  await wrapper.vm.$nextTick();

  scene.x = 7;
  scene.y = 8;
  await wrapper.vm.$nextTick();

  scene.isDrawing = false;
  await wrapper.vm.$nextTick();

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

  expect(wrapper.emitted('update')?.at(0)).toEqual([
    [
      { x: 12, y: 0 },
      { x: 9.70820393249937, y: 7.053423027509678 },
      { x: 3.7082039324993694, y: 11.412678195541842 },
      { x: -3.708203932499368, y: 11.412678195541844 },
      { x: -7.053423027509677, y: 9.70820393249937 },
      { x: -11.412678195541842, y: 3.7082039324993703 },
      { x: -11.412678195541844, y: -3.7082039324993676 },
      { x: -9.70820393249937, y: -7.053423027509677 },
      { x: -3.7082039324993707, y: -11.412678195541842 },
      { x: 3.7082039324993668, y: -11.412678195541844 },
      { x: 9.708203932499368, y: -7.05342302750968 },
      { x: 11.412678195541842, y: -3.708203932499371 },
    ],
  ]);
});

it('cancells drawing a bed', async () => {
  const wrapper = mount(GardenGuild, {
    props: {
      guild: { id: 'guild', path: [], plants: [], name: 'A guild', mulchLevel: 1 },
      unitLengthPx: 5,
      hovered: false,
      selected: false,
    },
    attachTo: document.body,
  });

  const scene = useSceneStore();

  await wrapper.setProps({ selected: true, tool: 'edit' });

  scene.isDrawing = true;
  scene.x = 5;
  scene.y = 6;
  scene.x = 7;
  scene.y = 8;

  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  scene.isDrawing = false;

  expect(wrapper.emitted('update')).toBeUndefined();
});

it('discards unsaved path edits when deselected', async () => {
  const scene = useSceneStore();
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
    props: {
      guild,
      unitLengthPx: 5,
      hovered: false,
      selected: true,
      tool: 'edit',
    },
    attachTo: document.body,
  });

  scene.isDrawing = true;
  scene.x = 50;
  scene.y = 50;
  await wrapper.vm.$nextTick();
  scene.isDrawing = false;
  await wrapper.vm.$nextTick();

  const pathBeforeDeselect = wrapper
    .get('polygon[class*="pointer-events-fill"]')
    .attributes('points');
  expect(pathBeforeDeselect).not.toEqual(
    guild.path.map(({ x, y }) => `${x},${y}`).join(' '),
  );

  await wrapper.setProps({ selected: false });
  await wrapper.vm.$nextTick();

  const pathAfterDeselect = wrapper
    .get('polygon[class*="pointer-events-fill"]')
    .attributes('points');
  expect(pathAfterDeselect).toEqual(guild.path.map(({ x, y }) => `${x},${y}`).join(' '));
  expect(wrapper.emitted('update')).toBeUndefined();
});

it('changes brush size', async () => {
  const wrapper = mount(GardenGuild, {
    props: {
      guild: { id: 'guild', path: [], plants: [], name: 'A guild', mulchLevel: 1 },
      unitLengthPx: 5,
      hovered: false,
      selected: true,
      tool: 'edit',
    },
    attachTo: document.body,
  });

  expect(wrapper.get('polygon').attributes('points')).toBeDefined();
  const pointsAtDefaultSize = wrapper.get('polygon').attributes('points');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '+' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('polygon').attributes('points')).not.toEqual(pointsAtDefaultSize);
  const pointsAtLargerSize = wrapper.get('polygon').attributes('points');

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('polygon').attributes('points')).toEqual(pointsAtDefaultSize);

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '-' }));
  await wrapper.vm.$nextTick();
  expect(wrapper.get('polygon').attributes('points')).not.toEqual(pointsAtDefaultSize);
  expect(wrapper.get('polygon').attributes('points')).not.toEqual(pointsAtLargerSize);
});

it('does not draw when select tool is active', async () => {
  const scene = useSceneStore();
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
    props: {
      guild,
      unitLengthPx: 5,
      hovered: false,
      selected: true,
      tool: 'select',
    },
    attachTo: document.body,
  });

  scene.isDrawing = true;
  scene.x = 50;
  scene.y = 50;
  await wrapper.vm.$nextTick();
  scene.isDrawing = false;
  await wrapper.vm.$nextTick();

  expect(
    wrapper.get('polygon[class*="pointer-events-fill"]').attributes('points'),
  ).toEqual(guild.path.map(({ x, y }) => `${x},${y}`).join(' '));
});

it('moves a placed guild', async () => {
  const scene = useSceneStore();
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
    props: {
      guild,
      unitLengthPx: 5,
      hovered: false,
      selected: true,
      tool: 'move',
    },
    attachTo: document.body,
  });

  scene.worldX = 0;
  scene.worldY = 0;
  await wrapper
    .get('polygon[class*="pointer-events-fill"]')
    .trigger('pointerdown', { button: 0 });
  scene.worldX = 5;
  scene.worldY = 7;
  document.dispatchEvent(new MouseEvent('pointermove', { buttons: 1, bubbles: true }));
  await wrapper.vm.$nextTick();
  document.dispatchEvent(new MouseEvent('pointerup'));
  await wrapper.vm.$nextTick();

  expect(wrapper.emitted('move')?.at(0)).toEqual([
    [
      { x: 5, y: 7 },
      { x: 15, y: 7 },
      { x: 15, y: 17 },
    ],
  ]);
});

it.each([
  {
    scenario: 'uses the pointerdown position when scene coordinates are stale',
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
    move: undefined,
    release: { clientX: 108, clientY: 214 },
    expected: [
      { x: 8, y: 14 },
      { x: 18, y: 14 },
      { x: 18, y: 24 },
    ],
  },
])('$scenario', async ({ move, release, expected }) => {
  const clientToSvgUser = vi
    .spyOn(svgClientToUser, 'clientToSvgUser')
    .mockImplementation((_svg, x, y) => ({ x, y }));
  const scene = useSceneStore();
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
  const wrapper = mount(
    {
      components: { GardenGuild },
      template: `
        <svg xmlns="http://www.w3.org/2000/svg">
          <GardenGuild
            :guild="guild"
            :unit-length-px="5"
            :hovered="false"
            :selected="true"
            tool="move"
          />
        </svg>
      `,
      setup() {
        return { guild };
      },
    },
    { attachTo: document.body },
  );

  scene.worldX = 0;
  scene.worldY = 0;
  await wrapper
    .get('polygon[class*="pointer-events-fill"]')
    .trigger('pointerdown', { button: 0, clientX: 100, clientY: 200 });
  if (move) {
    scene.worldX = move.clientX;
    scene.worldY = move.clientY;
    document.dispatchEvent(
      new MouseEvent('pointermove', { ...move, buttons: 1, bubbles: true }),
    );
    await nextTick();
  }
  document.dispatchEvent(new MouseEvent('pointerup', { ...release, bubbles: true }));
  await nextTick();

  expect(clientToSvgUser).toHaveBeenCalled();
  expect(wrapper.findComponent(GardenGuild).emitted('move')?.at(0)).toEqual([expected]);
  clientToSvgUser.mockRestore();
  wrapper.unmount();
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
  wrapper.unmount();
});
