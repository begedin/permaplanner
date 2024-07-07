import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGardenStore } from './useGardenStore';
import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

beforeEach(() => {
  setActivePinia(createTestingPinia({ createSpy: vi.fn, stubActions: false }));
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
