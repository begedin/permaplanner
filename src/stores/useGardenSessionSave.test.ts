import { flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

import * as gardensApi from '../api/gardens';
import { ApiError } from '../api/client';
import { usePermaplannerStore } from '../usePermaplannerStore';
import { usePlanCommandHistory } from '../usePlanCommandHistory';
import { useAuthStore } from './useAuthStore';
import { useGardenSessionStore } from './useGardenSessionStore';

vi.mock('../api/gardens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/gardens')>()),
  updateGarden: vi.fn(),
  listGardens: vi.fn().mockResolvedValue([]),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  useAuthStore().user = { id: 'u1', email: 't@example.com', totpConfirmed: true };
  usePermaplannerStore().gardenId = 'g1';
  vi.mocked(gardensApi.updateGarden).mockResolvedValue(1);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(gardensApi.updateGarden).mockReset();
});

const plant = { id: 'p1', speciesId: 'comfrey', cultivarId: null };

it('only saves after an explicit request, with no automatic saves after edits or undo', async () => {
  vi.useFakeTimers();
  const store = usePermaplannerStore();
  const session = useGardenSessionStore();
  session.markSaved();
  const history = usePlanCommandHistory();
  history.runMutation(() => {
    store.plants = [plant];
  });
  await vi.advanceTimersByTimeAsync(10000);

  expect(gardensApi.updateGarden).not.toHaveBeenCalled();
  expect(session).toMatchObject({ status: 'unsaved', canSave: true });
  await session.save();
  expect(session).toMatchObject({ status: 'saved', canSave: false });

  history.undo();
  await vi.advanceTimersByTimeAsync(10000);
  expect(gardensApi.updateGarden).toHaveBeenCalledTimes(1);
  expect(session.canSave).toBe(true);
  await session.save();
  expect(vi.mocked(gardensApi.updateGarden).mock.calls[1]).toEqual([
    'g1',
    expect.objectContaining({ syncRevision: 1, plants: [] }),
  ]);
});

it('does not save a clean plan and becomes clean when undo returns to the saved state', async () => {
  const store = usePermaplannerStore();
  const session = useGardenSessionStore();
  session.markSaved();
  const history = usePlanCommandHistory();
  history.runMutation(() => {
    store.plants = [plant];
  });
  history.undo();
  expect(session).toMatchObject({ canSave: false, hasUnsavedChanges: false });
  await session.save();
  expect(gardensApi.updateGarden).not.toHaveBeenCalled();
  history.redo();
  expect(session.canSave).toBe(true);
});

it('does not mark the initial load unsaved before markSaved', () => {
  usePermaplannerStore().plants = [plant];
  expect(useGardenSessionStore().hasUnsavedChanges).toBe(false);
});

it('preserves edits made during a save as dirty without scheduling another save', async () => {
  vi.useFakeTimers();
  const store = usePermaplannerStore();
  const session = useGardenSessionStore();
  session.markSaved();
  store.plants = [plant];
  let finishSave!: (revision: number) => void;
  vi.mocked(gardensApi.updateGarden).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSave = resolve;
      }),
  );
  const pending = session.save();
  await flushPromises();
  expect(session).toMatchObject({
    status: 'saving',
    canSave: false,
    hasUnsavedChanges: true,
  });
  store.backgroundOpacity = 0.8;
  await session.save();
  expect(gardensApi.updateGarden).toHaveBeenCalledTimes(1);
  finishSave(1);
  await pending;
  await vi.advanceTimersByTimeAsync(10000);
  expect(session).toMatchObject({ status: 'unsaved', canSave: true });
  expect(gardensApi.updateGarden).toHaveBeenCalledTimes(1);
});

it('keeps changes and undo history on a conflict and allows an explicit retry', async () => {
  const store = usePermaplannerStore();
  const session = useGardenSessionStore();
  session.markSaved();
  const history = usePlanCommandHistory();
  history.runMutation(() => {
    store.plants = [plant];
  });
  vi.mocked(gardensApi.updateGarden).mockRejectedValueOnce(new ApiError(409, {}));
  await session.save();
  expect(store).toMatchObject({ plants: [plant], syncRevision: 0 });
  expect(history.canUndo).toBe(true);
  expect(session).toMatchObject({
    status: 'error',
    canSave: true,
    errorMessage: expect.stringContaining('Your changes are still here'),
  });
  await session.save();
  expect(session).toMatchObject({ status: 'saved', canSave: false });
});

it('omits unchanged images and explicitly saves image removal after undo during upload', async () => {
  const store = usePermaplannerStore();
  const session = useGardenSessionStore();
  session.markSaved();
  store.plants = [plant];
  await session.save();
  expect(vi.mocked(gardensApi.updateGarden).mock.calls[0]?.[1]).not.toHaveProperty(
    'backgroundImage',
  );
  const history = usePlanCommandHistory();
  history.runMutation(() => {
    store.backgroundImageDataUrl = 'data:image/png;base64,new';
  });
  let finishSave!: (revision: number) => void;
  vi.mocked(gardensApi.updateGarden).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishSave = resolve;
      }),
  );
  const pending = session.save();
  await flushPromises();
  history.undo();
  expect(session.hasUnsavedChanges).toBe(true);
  finishSave(2);
  await pending;
  expect(session.canSave).toBe(true);
  await session.save();
  expect(vi.mocked(gardensApi.updateGarden).mock.calls[2]).toEqual([
    'g1',
    expect.objectContaining({ syncRevision: 2, backgroundImage: null }),
  ]);
});

it('asks before leaving with unsaved changes and respects cancellation', () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  const session = useGardenSessionStore();
  session.markSaved();
  expect(session.confirmLeave()).toBe(true);
  expect(confirm).not.toHaveBeenCalled();
  usePermaplannerStore().plants = [plant];
  expect(session.confirmLeave()).toBe(false);
  confirm.mockReturnValue(true);
  expect(session.confirmLeave()).toBe(true);
});

it('updates save details directly from the garden list', () => {
  const store = usePermaplannerStore();
  store.gardenName = 'Backyard';
  const session = useGardenSessionStore();
  expect(session.details).toEqual([
    { label: 'Garden', value: 'Backyard' },
    { label: 'Last saved', value: '—' },
  ]);
  const updatedAt = '2026-09-21T12:00:00.000Z';
  useGardenSessionStore().gardens = [
    { id: 'g1', name: 'Backyard', syncRevision: 1, updatedAt },
  ];
  expect(session.details).toEqual([
    { label: 'Garden', value: 'Backyard' },
    { label: 'Last saved', value: new Date(updatedAt).toLocaleString() },
  ]);
});

it('keeps a successful save clean when refreshing the garden list fails', async () => {
  const session = useGardenSessionStore();
  session.markSaved();
  usePermaplannerStore().plants = [plant];
  vi.mocked(gardensApi.listGardens).mockRejectedValueOnce(new Error('Network error'));
  await session.save();
  expect(session).toMatchObject({
    status: 'saved',
    canSave: false,
    errorMessage: undefined,
  });
});
