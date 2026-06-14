import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';

import TheGarden from './TheGarden.vue';
import { createAuthedTestRouter } from './testing/authedTestSession';
import { routeNames, routeParam } from './router';
import { useGardenStore } from './useGardenStore';
import GardenGuild from './GardenGuild.vue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { useSceneStore } from './useSceneStore';
import { resetGuildSearch } from './useGuildSearch';

beforeAll(() => {
  Object.defineProperties(window.navigator, {
    storage: {
      get: () => ({ persist: vi.fn }),
    },
  });
});

beforeEach(() => {
  setActivePinia(createTestingPinia({ stubActions: false, createSpy: vi.fn }));
  resetGuildSearch();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const store = usePermaplannerStore();
  store.gardenId = 'g1';
  store.gardenName = 'test';
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
});

const renderGarden = async (path = '/aerial') => {
  const router = await createAuthedTestRouter(path);
  return { router, view: render(TheGarden, { global: { plugins: [router] } }) };
};

it('deselects when the aerial page title is clicked', async () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];
  const { router } = await renderGarden('/aerial/guild');

  expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
    'Guild',
  );
  await fireEvent.click(screen.getByRole('button', { name: 'Deselect guild, Aerial' }));
  await flushPromises();
  await router.isReady();

  expect(router.currentRoute.value.name).toBe(routeNames.aerial);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
});

it('shows the aerial header and guild list in the left sidebar', async () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', name: 'A guild', mulchLevel: 1, plants: [], path: [] },
    { id: 'guild-2', name: 'Another guild', mulchLevel: 1, plants: [], path: [] },
  ];
  await renderGarden();

  expect(screen.getByRole('heading', { name: 'Aerial', level: 1 })).toBeTruthy();
  expect(screen.getByRole('complementary', { name: 'Guild list' })).toBeTruthy();
  expect(screen.getByRole('article', { name: 'A guild' })).toBeTruthy();
  expect(screen.getByRole('region', { name: 'Aerial map' })).toBeTruthy();
});

it('filters guilds in the sidebar by search query', async () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', name: 'A guild', mulchLevel: 1, plants: [], path: [] },
    { id: 'guild-2', name: 'Another guild', mulchLevel: 1, plants: [], path: [] },
  ];
  await renderGarden();

  await fireEvent.update(
    screen.getByRole('searchbox', { name: 'Search guilds' }),
    'Another',
  );

  expect(screen.getByRole('article', { name: 'Another guild' })).toBeTruthy();
  expect(screen.queryByRole('article', { name: 'A guild' })).toBeNull();
});

it('deletes the selected guild on Delete only when confirmed', async () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', path: [{ x: 0, y: 0 }], name: 'Bed', plants: [], mulchLevel: 1 },
  ];
  const { router } = await renderGarden('/aerial/guild');

  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  expect(store.guilds).toEqual([
    { id: 'guild', path: [{ x: 0, y: 0 }], name: 'Bed', plants: [], mulchLevel: 1 },
  ]);

  confirm.mockReturnValueOnce(true);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }));
  expect(store.guilds).toEqual([]);
  await flushPromises();
  await router.isReady();
  expect(router.currentRoute.value.name).toBe(routeNames.aerial);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
});

it('switches selection to another guild and discards the previous edit', async () => {
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
  const { router } = await renderGarden('/aerial/a');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });
  await wrapper.vm.$nextTick();

  const scene = useSceneStore();
  scene.isDrawing = true;
  scene.x = 50;
  scene.y = 50;
  await wrapper.vm.$nextTick();
  scene.isDrawing = false;
  await wrapper.vm.$nextTick();

  const guildB = wrapper
    .findAllComponents(GardenGuild)
    .find((c) => c.props('guild')?.id === 'b');
  await guildB?.find('polygon.pointer-events-fill').trigger('click');
  await flushPromises();
  await router.isReady();

  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBe('b');
  expect(store.guilds.find((g) => g.id === 'a')?.path).toEqual(bedA.path);
});

it('deselects when placement is cancelled', async () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];
  const { router } = await renderGarden('/aerial/guild');
  const wrapper = mount(TheGarden, { global: { plugins: [router] } });
  store.hoveredId = 'guild';
  await wrapper.vm.$nextTick();
  const guildComponents = wrapper.findAllComponents(GardenGuild);
  const placement = guildComponents.find((c) => c.props('guild')?.id === 'guild');
  await placement?.vm.$emit('cancel');
  await flushPromises();
  await router.isReady();
  expect(router.currentRoute.value.name).toBe(routeNames.aerial);
  expect(routeParam(router.currentRoute.value.params, 'guildId')).toBeUndefined();
  expect(store.hoveredId).toBeUndefined();
});
