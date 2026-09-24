import { flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';

import * as gardensApi from '../api/gardens';
import type { GardenRecord } from '../api/gardens';
import { GARDEN_DOCUMENT_VERSION, type GardenDocument } from '../gardenDocument';
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

const gardenRecord = (id: string, revision = 0): GardenRecord => {
  const document: GardenDocument = {
    version: GARDEN_DOCUMENT_VERSION,
    syncRevision: revision,
    plants: [],
    guilds: [],
    mapScale: {
      start: { x: 20, y: 20 },
      end: { x: 150, y: 20 },
      linePhysicalLength: 1,
    },
    backgroundOpacity: 0.4,
    onboardingState: 'initial',
  };
  return {
    id,
    name: `Garden ${id}`,
    syncRevision: revision,
    fileVersion: GARDEN_DOCUMENT_VERSION,
    document,
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
    usePermaplannerStore().backgroundOpacity = 0.7;
  });
  vi.mocked(gardensApi.fetchGarden).mockRejectedValueOnce(new Error('Network error'));

  await expect(session.activateGarden('g2')).rejects.toThrow('Network error');

  expect(usePermaplannerStore()).toMatchObject({
    gardenId: 'g1',
    backgroundOpacity: 0.7,
  });
  expect(usePlanCommandHistory().canUndo).toBe(true);
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe('g1');
});

it('ignores an activation response superseded by a newer request', async () => {
  let finishFirst!: (garden: GardenRecord) => void;
  let finishSecond!: (garden: GardenRecord) => void;
  vi.mocked(gardensApi.fetchGarden)
    .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
    .mockImplementationOnce(() => new Promise((resolve) => (finishSecond = resolve)));
  const session = useGardenSessionStore();

  const first = session.activateGarden('g1');
  const second = session.activateGarden('g2');
  finishSecond(gardenRecord('g2', 2));
  await second;
  finishFirst(gardenRecord('g1', 1));
  await first;

  expect(usePermaplannerStore()).toMatchObject({
    gardenId: 'g2',
    gardenName: 'Garden g2',
    syncRevision: 2,
  });
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe('g2');
});

it('ignores save completion after another garden becomes active', async () => {
  const session = useGardenSessionStore();
  await session.activateGardenRecord(gardenRecord('g1'));
  usePermaplannerStore().backgroundOpacity = 0.7;
  let finishSave!: (revision: number) => void;
  vi.mocked(gardensApi.updateGarden).mockImplementationOnce(
    () => new Promise((resolve) => (finishSave = resolve)),
  );

  const pendingSave = session.save();
  await flushPromises();
  await session.activateGardenRecord(gardenRecord('g2', 4));
  finishSave(99);
  await pendingSave;

  expect(usePermaplannerStore()).toMatchObject({
    gardenId: 'g2',
    syncRevision: 4,
    backgroundOpacity: 0.4,
  });
  expect(session).toMatchObject({ status: 'saved', canSave: false });
});

it('ignores save completion after the session is reset', async () => {
  const session = useGardenSessionStore();
  await session.activateGardenRecord(gardenRecord('g1'));
  usePermaplannerStore().backgroundOpacity = 0.7;
  let failSave!: (error: Error) => void;
  vi.mocked(gardensApi.updateGarden).mockImplementationOnce(
    () => new Promise((_resolve, reject) => (failSave = reject)),
  );

  const pendingSave = session.save();
  await flushPromises();
  await session.reset();
  failSave(new Error('Late failure'));
  await pendingSave;

  expect(usePermaplannerStore()).toMatchObject({
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
  let failList!: (error: Error) => void;
  vi.mocked(gardensApi.listGardens).mockImplementationOnce(
    () => new Promise((_resolve, reject) => (failList = reject)),
  );
  const session = useGardenSessionStore();

  const first = session.bootstrap();
  const duplicate = session.bootstrap();
  failList(new Error('Offline'));
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

  expect(usePermaplannerStore()).toMatchObject({
    gardenId: 'created',
    gardenName: 'Garden created',
  });
  expect(localStorage.getItem('permaplanner.activeGardenId')).toBe('created');
});
