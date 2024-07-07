import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGardenStore } from './useGardenStore';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { nextTick } from 'vue';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
});

describe('startDrawBed', () => {
  it('sets new bed on next tick', async () => {
    const store = useGardenStore();
    expect(store.newBed).toBeUndefined();

    store.startDrawBed();
    expect(store.newBed).toBeUndefined();

    await nextTick();

    expect(store.newBed).toBeDefined();
  });
});

describe('editBed', () => {
  it('sets edited, hovered and selected bed', async () => {
    const store = useGardenStore();
    store.gardenBeds = [
      { id: 'bed', path: [] },
      { id: 'bed2', path: [] },
    ];

    await store.editBed('bed');

    expect(store.hoveredId).toEqual('bed');
    expect(store.selectedId).toEqual('bed');
  });

  it('unsets new bed', () => {
    const store = useGardenStore();
    store.gardenBeds = [{ id: 'bed', path: [] }];
    store.newBed = { id: 'bed', path: [] };

    store.editBed('bed');

    expect(store.newBed).toBeUndefined();
  });
});

describe('removeBed', () => {
  it('removes bed', () => {
    const store = useGardenStore();
    store.gardenBeds = [
      { id: 'bed', path: [] },
      { id: 'bed2', path: [] },
    ];

    store.removeBed('bed');

    expect(store.gardenBeds).toEqual([{ id: 'bed2', path: [] }]);
  });

  it('does nothing if bed not found', () => {
    const store = useGardenStore();
    store.gardenBeds = [{ id: 'bed', path: [] }];

    store.removeBed('bed2');

    expect(store.gardenBeds).toEqual([{ id: 'bed', path: [] }]);
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
