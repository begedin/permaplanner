import { usePlanStateStore } from '../usePlanStateStore';
import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';

import * as gardensApi from '../api/gardens';
import type { GardenRecord } from '../api/gardens';
import { GARDEN_DOCUMENT_VERSION } from '../gardenDocument';
import { createEmptyPlanState } from '../planSavableState';
import { usePermaplannerStore } from '../usePermaplannerStore';
import { usePlanCommandHistory } from '../usePlanCommandHistory';
import { useAuthStore } from './useAuthStore';
import { useGardenSessionStore } from './useGardenSessionStore';

vi.mock('../api/gardens', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/gardens')>()),
  createGarden: vi.fn(),
  fetchGarden: vi.fn(),
  listGardens: vi.fn(),
  updateGarden: vi.fn(),
}));

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};

const gardenRecord = (id: string, revision = 0): GardenRecord => {
  const { backgroundImageDataUrl: _image, ...data } = createEmptyPlanState();
  return {
    id,
    name: `Garden ${id}`,
    syncRevision: revision,
    fileVersion: GARDEN_DOCUMENT_VERSION,
    document: { ...data, version: GARDEN_DOCUMENT_VERSION, syncRevision: revision },
    updatedAt: '2026-09-24T08:00:00.000Z',
    insertedAt: '2026-09-24T08:00:00.000Z',
  };
};

beforeEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
  useAuthStore().user = { id: 'u1', email: 'test@example.com', totpConfirmed: true };
  vi.mocked(gardensApi.createGarden).mockReset();
  vi.mocked(gardensApi.fetchGarden).mockReset();
  vi.mocked(gardensApi.listGardens).mockReset();
  vi.mocked(gardensApi.updateGarden).mockReset();
});

it('preserves the active garden, history, and persisted selection when activation fails', async () => {
  const session = useGardenSessionStore();
  await session.activateGardenRecord(gardenRecord('g1'));
  usePlanCommandHistory().runMutation(() => {
    usePlanStateStore().state.backgroundOpacity = 0.7;
  });
  vi.mocked(gardensApi.fetchGarden).mockRejectedValueOnce(new Error('Network error'));

  await expect(session.activateGarden('g2')).rejects.toThrow('Network error');

  expect({ ...usePermaplannerStore(), ...session }).toMatchObject({
    gardenId: 'g1',
    backgroundOpacity: 0.7,
  });
  expect(usePlanCommandHistory().canUndo).toBe(true);
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe('g1');
});

it('ignores an activation response superseded by a newer request', async () => {
  const firstResponse = deferred<GardenRecord>();
  const secondResponse = deferred<GardenRecord>();
  vi.mocked(gardensApi.fetchGarden)
    .mockReturnValueOnce(firstResponse.promise)
    .mockReturnValueOnce(secondResponse.promise);
  const session = useGardenSessionStore();

  const first = session.activateGarden('g1');
  const second = session.activateGarden('g2');
  secondResponse.resolve(gardenRecord('g2', 2));
  await second;
  firstResponse.resolve(gardenRecord('g1', 1));
  await first;

  expect({ ...usePermaplannerStore(), ...session }).toMatchObject({
    gardenId: 'g2',
    gardenName: 'Garden g2',
    syncRevision: 2,
  });
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe('g2');
});

it('ignores save completion after another garden becomes active', async () => {
  const session = useGardenSessionStore();
  await session.activateGardenRecord(gardenRecord('g1'));
  usePlanStateStore().state.backgroundOpacity = 0.7;
  const response = deferred<number>();
  vi.mocked(gardensApi.updateGarden).mockReturnValueOnce(response.promise);

  const pendingSave = session.save();
  await flushPromises();
  await session.activateGardenRecord(gardenRecord('g2', 4));
  response.resolve(99);
  await pendingSave;

  expect({ ...usePermaplannerStore(), ...session }).toMatchObject({
    gardenId: 'g2',
    syncRevision: 4,
    backgroundOpacity: 0.4,
  });
  expect(session).toMatchObject({ status: 'saved', canSave: false });
});

it('ignores save completion after the session is reset', async () => {
  const session = useGardenSessionStore();
  await session.activateGardenRecord(gardenRecord('g1'));
  usePlanStateStore().state.backgroundOpacity = 0.7;
  const response = deferred<number>();
  vi.mocked(gardensApi.updateGarden).mockReturnValueOnce(response.promise);

  const pendingSave = session.save();
  await flushPromises();
  await session.reset();
  response.reject(new Error('Late failure'));
  await pendingSave;

  expect({ ...usePermaplannerStore(), ...session }).toMatchObject({
    gardenId: undefined,
    syncRevision: 0,
    backgroundOpacity: 0.4,
  });
  expect(session).toMatchObject({
    status: 'inactive',
    errorMessage: undefined,
    isBootstrapping: true,
  });
});

it('deduplicates bootstrap work and can retry after a failure', async () => {
  const response = deferred<gardensApi.GardenSummary[]>();
  vi.mocked(gardensApi.listGardens).mockReturnValueOnce(response.promise);
  const session = useGardenSessionStore();

  const first = session.bootstrap();
  const duplicate = session.bootstrap();
  response.reject(new Error('Offline'));
  await expect(first).rejects.toThrow('Offline');
  await expect(duplicate).rejects.toThrow('Offline');
  expect(gardensApi.listGardens).toHaveBeenCalledTimes(1);

  vi.mocked(gardensApi.listGardens).mockResolvedValueOnce([]);
  await session.bootstrap();
  expect(gardensApi.listGardens).toHaveBeenCalledTimes(2);
  expect(session.isBootstrapping).toBe(false);
});

it('keeps a created garden active when refreshing the list fails', async () => {
  vi.mocked(gardensApi.createGarden).mockResolvedValueOnce(gardenRecord('created'));
  vi.mocked(gardensApi.listGardens).mockRejectedValueOnce(new Error('List failed'));

  await useGardenSessionStore().createEmptyGarden('Created');

  expect({ ...usePermaplannerStore(), ...useGardenSessionStore() }).toMatchObject({
    gardenId: 'created',
    gardenName: 'Garden created',
  });
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe('created');
});

it('finishes account list loading after the active garden changes', async () => {
  const response = deferred<gardensApi.GardenSummary[]>();
  vi.mocked(gardensApi.listGardens).mockReturnValueOnce(response.promise);
  const session = useGardenSessionStore();
  const refresh = session.refreshList();
  await session.activateGardenRecord(gardenRecord('g2'));
  response.resolve([]);
  await refresh;
  expect(session).toMatchObject({ loading: false, gardens: [] });
});

it('finishes bootstrap when activation supersedes its pending request', async () => {
  const response = deferred<gardensApi.GardenSummary[]>();
  vi.mocked(gardensApi.listGardens).mockReturnValueOnce(response.promise);
  const session = useGardenSessionStore();
  const bootstrap = session.bootstrap();
  await session.activateGardenRecord(gardenRecord('imported'));
  response.resolve([]);
  await bootstrap;
  expect(session.isBootstrapping).toBe(false);
  expect(useGardenSessionStore().gardenId).toBe('imported');
});

it('does not let a previous account finish the new bootstrap', async () => {
  const oldResponse = deferred<gardensApi.GardenSummary[]>();
  const newResponse = deferred<gardensApi.GardenSummary[]>();
  vi.mocked(gardensApi.listGardens)
    .mockReturnValueOnce(oldResponse.promise)
    .mockReturnValueOnce(newResponse.promise);
  const session = useGardenSessionStore();
  const oldBootstrap = session.bootstrap();
  await session.reset();
  const newBootstrap = session.bootstrap();
  oldResponse.resolve([]);
  await oldBootstrap;
  expect(session.isBootstrapping).toBe(true);
  newResponse.resolve([]);
  await newBootstrap;
  expect(session.isBootstrapping).toBe(false);
});
