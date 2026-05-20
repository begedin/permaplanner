import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGardenStore } from './useGardenStore';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
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

it('removeGuild does nothing when deletion is not confirmed', () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [], mulchLevel: 1 }];
  store.selectedId = 'guild';
  store.hoveredId = 'guild';

  store.removeGuild('guild');

  expect(store.guilds).toEqual([{ id: 'guild', name: 'Guild', path: [], plants: [], mulchLevel: 1 }]);
  expect(store.selectedId).toBe('guild');
});

it('deleteFeature removes a guild only after confirmation', () => {
  const confirm = vi.spyOn(window, 'confirm');
  confirm.mockReturnValueOnce(false).mockReturnValueOnce(true);
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [], name: 'Bed', plants: [], mulchLevel: 1 }];

  store.deleteFeature('guild');
  expect(store.guilds).toHaveLength(1);

  store.deleteFeature('guild');
  expect(store.guilds).toEqual([]);
  expect(confirm).toHaveBeenCalledWith('Delete guild “Bed”? This cannot be undone.');
});

it('removeGuildFromAerialMap clears path only', () => {
  const store = useGardenStore();
  store.guilds = [
    {
      id: 'g1',
      path: [{ x: 1, y: 2 }],
      name: 'Bed',
      plants: [{ id: 't', plantId: 'p', x: 0, y: 0, width: 1, height: 1, nameOrCultivar: 'x' }],
      mulchLevel: 1,
    },
  ];

  store.removeGuildFromAerialMap('g1');

  expect(store.guilds[0]).toMatchObject({
    id: 'g1',
    path: [],
    name: 'Bed',
    plants: [{ id: 't', plantId: 'p' }],
  });
});

it('removeGuildFromAerialMap does nothing if guild not found', () => {
  const store = useGardenStore();
  store.guilds = [{ id: 'guild', path: [{ x: 0, y: 0 }], name: 'Guild', plants: [], mulchLevel: 1 }];

  store.removeGuildFromAerialMap('other');

  expect(store.guilds[0]!.path).toEqual([{ x: 0, y: 0 }]);
});

it('deactivateAll unsets hovered and selected id', () => {
  const store = useGardenStore();
  store.hoveredId = 'thing';
  store.selectedId = 'thing';

  store.deactivateAll();

  expect(store.hoveredId).toBeUndefined();
  expect(store.selectedId).toBeUndefined();
});
