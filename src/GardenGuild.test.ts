import { enableAutoUnmount, mount } from '@vue/test-utils';
import { reactive, nextTick } from 'vue';
import { joinPaths, subtractPaths } from './guildPathClip';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import GardenGuild from './GardenGuild.vue';
import { useGardenStore } from './useGardenStore';
import { useCameraStore } from './useCameraStore';
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
      [
        [
          { x: 0, y: 0 },
          { x: 10, y: 0 },
          { x: 10, y: 10 },
        ],
      ],
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
    .get('path[class*="pointer-events-fill"]')
    .trigger('pointerdown', { button: 0, ...start });
  if (move) {
    document.dispatchEvent(
      new MouseEvent('pointermove', { ...move, buttons: 1, bubbles: true }),
    );
    await nextTick();
  }
  document.dispatchEvent(new MouseEvent('pointerup', { ...release, bubbles: true }));
  await nextTick();

  expect(wrapper.emitted('move')?.at(0)).toEqual([[[expected]]]);
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
    path: [[first]],
    plants: [],
    name: 'A',
    mulchLevel: 1 as const,
  });
  const wrapper = mount(GardenGuild, {
    props: { guild, unitLengthPx: 5, hovered: false, selected: false },
  });
  const hole = first.map(({ x, y }) => ({ x: x / 5 + 4, y: y / 5 + 4 }));
  guild.path = joinPaths(subtractPaths([[first]], [[hole]]), [[second]]);
  await nextTick();
  expect(wrapper.get('path.pointer-events-fill').attributes('d')).toContain('30,10');
  const outline = wrapper.get('path').attributes('d');
  expect(wrapper.get('path.pointer-events-fill').attributes('fill-rule')).toBe('evenodd');
  expect(outline?.match(/M /g)).toHaveLength(3);
  expect(outline).toContain('M 20,0 L 30,0');
  expect(outline).not.toContain('M 0,0 L 20,0');
  expect(outline).not.toContain('M 20,0 L 0,0');
});

const createPlantedGuild = () => {
  const garden = useGardenStore();
  garden.createGuild();
  const guild = garden.guilds[0]!;
  garden.setGuildPath(guild.id, [
    [
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 0 },
      ],
    ],
  ]);
  garden.addCatalogPlantToGuild(guild.id, 'apple', 'granny_smith');
  const thing = guild.plants[0]!;
  garden.setPlantPlacement(guild.id, thing.id, { x: 20, y: 20, width: 16, height: 16 });
  return { garden, guild, thing };
};

it('replaces guild names with optional plant labels only at maximum zoom', async () => {
  const { garden, guild, thing } = createPlantedGuild();
  const camera = useCameraStore();
  const wrapper = mount(GardenGuild, {
    props: { guild, unitLengthPx: 5, hovered: false, selected: false },
  });
  camera.zoom = 10;
  await nextTick();
  expect(wrapper.find('[data-plant-label]').exists()).toBe(false);
  await wrapper.setProps({ showPlantLabels: true });
  expect(wrapper.get('[data-plant-label]').text()).toContain('Granny Smith');
  expect(wrapper.findAll('text').map((label) => label.text())).not.toContain(guild.name);
  camera.zoom = 9.9;
  await nextTick();
  expect(wrapper.find('[data-plant-label]').exists()).toBe(false);
  expect(wrapper.findAll('text').map((label) => label.text())).toContain(guild.name);
  camera.zoom = 10;
  camera.scale = 0.1;
  await nextTick();
  expect(wrapper.find('[data-plant-label]').exists()).toBe(false);
  camera.scale = 1;
  await nextTick();
  expect(wrapper.get('[data-plant-label]').text()).toContain('Granny Smith');
  await wrapper.setProps({ showPlantLabels: false });
  expect(wrapper.findAll('text').map((label) => label.text())).toContain(guild.name);
  await wrapper.setProps({ showPlantLabels: true });
  garden.removePlantPlacement(guild.id, thing.id);
  await nextTick();
  expect(wrapper.find('[data-plant-label]').exists()).toBe(false);
  expect(wrapper.findAll('text').map((label) => label.text())).toContain(guild.name);
});

it.each(['cancel', 'commit'] as const)(
  'moves canopies and labels with the guild preview on %s',
  async (ending) => {
    const { garden, guild, thing } = createPlantedGuild();
    useCameraStore().zoom = 10;
    const wrapper = mount(GardenGuild, {
      attachTo: svg,
      props: {
        guild,
        unitLengthPx: 5,
        hovered: false,
        selected: true,
        tool: 'move',
        showPlantLabels: true,
        onMove: (path) => garden.setGuildPath(guild.id, path, true),
      },
    });
    await wrapper
      .get('path.pointer-events-fill')
      .trigger('pointerdown', { button: 0, clientX: 0, clientY: 0 });
    document.dispatchEvent(
      new MouseEvent('pointermove', {
        clientX: 5,
        clientY: 7,
        buttons: 1,
        bubbles: true,
      }),
    );
    await nextTick();
    const canopy = wrapper.get('.canopy');
    const label = wrapper.get('[data-plant-label]');
    expect(canopy.element.parentElement).toBe(label.element.parentElement);
    expect(canopy.element.parentElement).toHaveAttribute('transform', 'translate(5 7)');
    expect(thing).toMatchObject({ x: 20, y: 20 });
    if (ending === 'cancel')
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    else
      document.dispatchEvent(
        new MouseEvent('pointerup', { clientX: 5, clientY: 7, bubbles: true }),
      );
    await nextTick();
    expect(canopy.element.parentElement).toHaveAttribute('transform', 'translate(0 0)');
    expect(thing).toMatchObject(
      ending === 'cancel' ? { x: 20, y: 20 } : { x: 25, y: 27 },
    );
  },
);
