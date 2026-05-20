import { cleanup } from '@testing-library/vue';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import TheGarden from './TheGarden.vue';
import { useGardenStore } from './useGardenStore';
import GardenGuild from './GardenGuild.vue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { useSceneStore } from './useSceneStore';

beforeAll(() => {
  Object.defineProperties(window.navigator, {
    storage: {
      get: () => ({ persist: vi.fn }),
    },
  });
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const store = usePermaplannerStore();
  store.fileName = 'test';
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

it('deletes the selected guild on Delete only when confirmed', async () => {
  mount(TheGarden);
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [{ x: 0, y: 0 }], name: 'Bed', plants: [], mulchLevel: 1 }];
  store.selectedId = 'guild';

  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  expect(store.guilds).toEqual([{ id: 'guild', path: [{ x: 0, y: 0 }], name: 'Bed', plants: [], mulchLevel: 1 }]);

  confirm.mockReturnValueOnce(true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  expect(store.guilds).toEqual([]);
  expect(store.selectedId).toBeUndefined();
});

it('switches selection to another guild and discards the previous edit', async () => {
  const wrapper = mount(TheGarden);
  const store = useGardenStore();
  const bedA = {
    id: 'a',
    name: 'A',
    mulchLevel: 1 as const,
    path: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
    plants: [],
  };
  const bedB = {
    id: 'b',
    name: 'B',
    mulchLevel: 1 as const,
    path: [
      { x: 200, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 100 },
      { x: 200, y: 100 },
    ],
    plants: [],
  };
  store.guilds = [bedA, bedB];
  store.selectedId = 'a';
  await wrapper.vm.$nextTick();

  const scene = useSceneStore();
  scene.isDrawing = true;
  scene.x = 50;
  scene.y = 50;
  await wrapper.vm.$nextTick();
  scene.isDrawing = false;
  await wrapper.vm.$nextTick();

  const guildB = wrapper.findAllComponents(GardenGuild).find((c) => c.props('guild')?.id === 'b');
  await guildB?.find('polygon.pointer-events-fill').trigger('click');

  expect(store.selectedId).toBe('b');
  expect(store.guilds.find((g) => g.id === 'a')?.path).toEqual(bedA.path);
});

it('deselects when placement is cancelled', async () => {
  const wrapper = mount(TheGarden);
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];
  store.selectedId = 'guild';
  store.hoveredId = 'guild';
  await wrapper.vm.$nextTick();
  const guildComponents = wrapper.findAllComponents(GardenGuild);
  const placement = guildComponents.find((c) => c.props('guild')?.id === 'guild');
  await placement?.vm.$emit('cancel');
  expect(store.selectedId).toBeUndefined();
  expect(store.hoveredId).toBeUndefined();
});
