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

vi.mock('../api/gardens');

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
  vi.resetAllMocks();
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
  const firstResponse = Promise.withResolvers<GardenRecord>();
  const secondResponse = Promise.withResolvers<GardenRecord>();
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
  const response = Promise.withResolvers<number>();
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
  const response = Promise.withResolvers<number>();
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
  const response = Promise.withResolvers<gardensApi.GardenSummary[]>();
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

it('activates a created garden and adds its summary to the cached list', async () => {
  const session = useGardenSessionStore();
  const garden = gardenRecord('created', 1);
  const { id, name, syncRevision, updatedAt } = garden;
  const existing = { id: 'first', name: 'First garden', syncRevision: 0, updatedAt };
  session.gardens = [existing];
  vi.mocked(gardensApi.createGarden).mockResolvedValueOnce(garden);

  await session.createEmptyGarden(name);

  expect(session.gardens).toEqual([existing, { id, name, syncRevision, updatedAt }]);
  expect(session).toMatchObject({ gardenId: id, gardenName: name });
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe(id);
});

it.each([
  ['refreshList', 'loading'],
  ['bootstrap', 'isBootstrapping'],
] as const)(
  'keeps the imported garden when a pending %s finishes',
  async (load, loadingFlag) => {
    const response = Promise.withResolvers<gardensApi.GardenSummary[]>();
    vi.mocked(gardensApi.listGardens).mockReturnValueOnce(response.promise);
    const session = useGardenSessionStore();
    const pending = session[load]();
    session.activateGardenRecord(gardenRecord('imported'));
    response.resolve([]);
    await pending;
    expect(session).toMatchObject({
      [loadingFlag]: false,
      gardenId: 'imported',
      gardens: [{ id: 'imported' }],
    });
  },
);

it('does not let a previous account finish the new bootstrap', async () => {
  const oldResponse = Promise.withResolvers<gardensApi.GardenSummary[]>();
  const newResponse = Promise.withResolvers<gardensApi.GardenSummary[]>();
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
