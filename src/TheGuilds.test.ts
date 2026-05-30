import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import TheGuilds from './TheGuilds.vue';
import { createGuildTestRouter } from './testGuildRouter';
import { useGardenStore } from './useGardenStore';
import { resetGuildSearch } from './useGuildSearch';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  resetGuildSearch();
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

it('shows guilds in a multi-column grid when none is selected', async () => {
  const { router } = await seedGuilds();
  const { container } = render(TheGuilds, { global: { plugins: [router] } });

  expect(screen.getByRole('article', { name: 'Alpha guild' })).toBeTruthy();
  expect(screen.getByRole('article', { name: 'Beta guild' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Guilds', level: 1 })).toBeTruthy();
  expect(container.querySelector('.guild-list')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
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

it('filters guilds by search query', async () => {
  const { router } = await seedGuilds();
  render(TheGuilds, { global: { plugins: [router] } });

  await fireEvent.update(
    screen.getByRole('searchbox', { name: 'Search guilds' }),
    'Beta',
  );

  expect(screen.getByRole('article', { name: 'Beta guild' })).toBeTruthy();
  expect(screen.queryByRole('article', { name: 'Alpha guild' })).toBeNull();
});

it('shows a message when search matches no guilds', async () => {
  const { router } = await seedGuilds();
  render(TheGuilds, { global: { plugins: [router] } });

  await fireEvent.update(
    screen.getByRole('searchbox', { name: 'Search guilds' }),
    'zzzz',
  );

  expect(screen.getByText('No guilds match “zzzz”.')).toBeTruthy();
  expect(screen.queryByRole('article', { name: 'Alpha guild' })).toBeNull();
});

it('focuses search on Cmd+F and /', async () => {
  const { router } = await seedGuilds();
  render(TheGuilds, { global: { plugins: [router] } });
  const search = screen.getByRole('searchbox', { name: 'Search guilds' });

  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'f', metaKey: true, bubbles: true }),
  );
  expect(document.activeElement).toBe(search);

  (document.activeElement as HTMLElement).blur();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));
  expect(document.activeElement).toBe(search);
});

it('focuses search on Ctrl+F', async () => {
  const { router } = await seedGuilds();
  render(TheGuilds, { global: { plugins: [router] } });
  const search = screen.getByRole('searchbox', { name: 'Search guilds' });

  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }),
  );
  expect(document.activeElement).toBe(search);
});

it('does not steal focus for / when typing in another input', async () => {
  const { router } = await seedGuilds('/guilds/a');
  render(TheGuilds, { global: { plugins: [router] } });
  const nameInput = screen.getByDisplayValue('Alpha guild');
  nameInput.focus();

  document.dispatchEvent(new KeyboardEvent('keydown', { key: '/', bubbles: true }));

  expect(document.activeElement).toBe(nameInput);
});

it('highlights matched text in guild list results', async () => {
  const { router } = await seedGuilds();
  const { container } = render(TheGuilds, { global: { plugins: [router] } });

  await fireEvent.update(
    screen.getByRole('searchbox', { name: 'Search guilds' }),
    'Beta',
  );

  expect(container.querySelector('mark.search-highlight')?.textContent).toBe('Beta');
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
