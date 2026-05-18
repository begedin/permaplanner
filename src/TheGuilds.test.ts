import { cleanup, fireEvent, render, screen } from '@testing-library/vue';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import TheGuilds from './TheGuilds.vue';
import { useGardenStore } from './useGardenStore';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

afterEach(() => cleanup());

const seedGuilds = () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'a', name: 'Alpha guild', plants: [], path: [], mulchLevel: 1 },
    { id: 'b', name: 'Beta guild', plants: [], path: [], mulchLevel: 1 },
  ];
  return store;
};

it('shows a list item per guild and a desktop empty detail hint when none is selected', () => {
  seedGuilds();
  render(TheGuilds);

  expect(screen.getByRole('article', { name: 'Alpha guild' })).toBeTruthy();
  expect(screen.getByRole('article', { name: 'Beta guild' })).toBeTruthy();
  expect(screen.getByText('Select a guild from the list to view and edit it.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Close guild details' })).toBeNull();
});

it('selects a guild from the list and shows full details with close', async () => {
  seedGuilds();
  render(TheGuilds);

  await fireEvent.click(screen.getByRole('article', { name: 'Beta guild' }));

  const store = useGardenStore();
  expect(store.selectedId).toBe('b');
  expect(screen.getByRole('button', { name: 'Delete guild' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Close guild details' })).toBeTruthy();
});

it('deselects when close is clicked', async () => {
  const store = seedGuilds();
  store.selectedId = 'a';
  render(TheGuilds);

  await fireEvent.click(screen.getByRole('button', { name: 'Close guild details' }));

  expect(store.selectedId).toBeUndefined();
});
