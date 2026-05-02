import { beforeEach, expect, it, vi } from 'vitest';
import { useGardenStore } from './useGardenStore';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

it('createGuild adds a guild and selects it', async () => {
  const store = useGardenStore();
  expect(store.guilds).toEqual([]);

  store.createGuild();
  await nextTick();

  expect(store.guilds).toMatchObject([{ name: 'New guild', path: [], plants: [], mulchLevel: 1 }]);
  expect(store.selectedId).toEqual(store.guilds[0]!.id);
  expect(store.hoveredId).toEqual(store.guilds[0]!.id);
});

it('editGuild sets edited, hovered and selected guild', async () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
    { id: 'guild2', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  await store.editGuild('guild');

  expect(store.hoveredId).toEqual('guild');
  expect(store.selectedId).toEqual('guild');
});

it('removeGuild removes guild', () => {
  const store = useGardenStore();
  store.guilds = [
    { id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
    { id: 'guild2', path: [], name: 'Guild', plants: [], mulchLevel: 1 },
  ];

  store.removeGuild('guild');

  expect(store.guilds).toEqual([{ id: 'guild2', name: 'Guild', path: [], plants: [], mulchLevel: 1 }]);
});

it('removeGuild does nothing if guild not found', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];

  store.removeGuild('guild2');

  expect(store.guilds).toEqual([{ id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 }]);
});

it('deactivateAll unsets hovered and selected id', () => {
  const store = useGardenStore();
  store.hoveredId = 'thing';
  store.selectedId = 'thing';

  store.deactivateAll();

  expect(store.hoveredId).toBeUndefined();
  expect(store.selectedId).toBeUndefined();
});
