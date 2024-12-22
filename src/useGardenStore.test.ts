import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGardenStore } from './useGardenStore';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

describe('startDrawGuild', () => {
  it('sets new guild on next tick', async () => {
    const store = useGardenStore();
    expect(store.newGuild).toBeUndefined();

    store.startDrawGuild();
    expect(store.newGuild).toBeUndefined();

    await nextTick();

    expect(store.newGuild).toBeDefined();
  });
});

describe('editGuild', () => {
  it('sets edited, hovered and selected guild', async () => {
    const store = useGardenStore();
    store.guilds = [
      { id: 'guild', path: [], name: 'Guild', plants: [] },
      { id: 'guild2', path: [], name: 'Guild', plants: [] },
    ];

    await store.editGuild('guild');

    expect(store.hoveredId).toEqual('guild');
    expect(store.selectedId).toEqual('guild');
  });

  it('unsets new guild', () => {
    const store = useGardenStore();
    store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [] }];
    store.newGuild = { id: 'guild', path: [], name: 'Guild', plants: [] };

    store.editGuild('guild');

    expect(store.newGuild).toBeUndefined();
  });
});

describe('removeGuild', () => {
  it('removes guild', () => {
    const store = useGardenStore();
    store.guilds = [
      { id: 'guild', path: [], name: 'Guild', plants: [] },
      { id: 'guild2', path: [], name: 'Guild', plants: [] },
    ];

    store.removeGuild('guild');

    expect(store.guilds).toEqual([{ id: 'guild2', name: 'Guild', path: [], plants: [] }]);
  });

  it('does nothing if guild not found', () => {
    const store = useGardenStore();
    store.guilds = [{ id: 'guild', path: [], name: 'Guild', plants: [] }];

    store.removeGuild('guild2');

    expect(store.guilds).toEqual([{ id: 'guild', name: 'Guild', path: [], plants: [] }]);
  });
});

describe('deactivateAll', () => {
  it('unsets hovered and selected id', () => {
    const store = useGardenStore();
    store.hoveredId = 'thing';
    store.selectedId = 'thing';

    store.deactivateAll();

    expect(store.hoveredId).toBeUndefined();
    expect(store.selectedId).toBeUndefined();
  });
});
