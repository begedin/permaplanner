import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import TheGuilds from './TheGuilds.vue';
import { createGuildTestRouter } from './testGuildRouter';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

const seedGuilds = async (initialPath = '/guilds') => {
  const router = createGuildTestRouter();
  const store = useGardenStore();
  store.guilds = [
    { id: 'a', name: 'Alpha guild', plants: [], path: [], mulchLevel: 1 },
    { id: 'b', name: 'Beta guild', plants: [], path: [], mulchLevel: 1 },
  ];
  await router.push(initialPath);
  await router.isReady();
  return { router, store };
};

it('shows a list item per guild and a desktop empty detail hint when none is selected', async () => {
  const { router } = await seedGuilds();
  render(TheGuilds, { global: { plugins: [router] } });

  expect(screen.getByRole('article', { name: 'Alpha guild' })).toBeTruthy();
  expect(screen.getByRole('article', { name: 'Beta guild' })).toBeTruthy();
  expect(
    screen.getByText('Select a guild from the list to view and edit it.'),
  ).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Guilds', level: 1 })).toBeTruthy();
});

it('selects a guild from the list and shows full details', async () => {
  const { router } = await seedGuilds();
  render(TheGuilds, { global: { plugins: [router] } });

  await fireEvent.click(screen.getByRole('article', { name: 'Beta guild' }));
  await flushPromises();
  await router.isReady();

  expect(router.currentRoute.value.params.guildId).toBe('b');
  expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
  expect(screen.getByRole('navigation', { name: 'Breadcrumb' }).textContent).toContain(
    'Beta guild',
  );
  expect(screen.getByRole('button', { name: 'Deselect guild, Guilds' })).toBeTruthy();
});

it('deselects when the page title is clicked', async () => {
  const { router, store } = await seedGuilds('/guilds/a');
  render(TheGuilds, { global: { plugins: [router] } });

  await fireEvent.click(screen.getByRole('button', { name: 'Deselect guild, Guilds' }));
  await flushPromises();
  await router.isReady();

  expect(router.currentRoute.value.name).toBe('guilds');
  expect(router.currentRoute.value.params.guildId).toBeUndefined();
  expect(store.hoveredId).toBeUndefined();
  expect(screen.getByRole('heading', { name: 'Guilds', level: 1 })).toBeTruthy();
});

it('add guild navigates with the new guild in the route', async () => {
  const router = createGuildTestRouter();
  await router.push('/guilds');
  await router.isReady();
  render(TheGuilds, { global: { plugins: [router] } });

  await fireEvent.click(screen.getByRole('button', { name: 'Add guild' }));
  await flushPromises();
  await router.isReady();

  const store = useGardenStore();
  expect(router.currentRoute.value.name).toBe('guilds-detail');
  expect(router.currentRoute.value.params.guildId).toBe(store.guilds[0]!.id);
  expect(screen.getByRole('button', { name: 'Delete' })).toBeTruthy();
});
