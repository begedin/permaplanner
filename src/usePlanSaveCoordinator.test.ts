import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, expect, it, vi } from 'vitest';

import { resetPlanSaveSerialQueueForTests } from './planSaveSerialQueue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';

beforeEach(() => {
  setActivePinia(createPinia());
  resetPlanSaveSerialQueueForTests();
});

it('starts saved after syncPersistedBaseline until the plan changes', () => {
  const store = usePermaplannerStore();
  store.fileHandle = { name: 'garden.json' } as FileSystemFileHandle;

  const coordinator = usePlanSaveCoordinator();
  coordinator.syncPersistedBaseline();

  expect(coordinator.views).toMatchObject([{ id: 'local-file', status: 'saved' }]);
  expect(coordinator.hasUnsavedChanges).toBe(false);

  store.plants.push({
    id: 'p1',
    speciesId: 'comfrey',
    cultivarId: null,
  });

  expect(coordinator.views).toMatchObject([{ id: 'local-file', status: 'unsaved' }]);
});

it('does not mark linked destinations unsaved before syncPersistedBaseline', () => {
  const store = usePermaplannerStore();
  store.fileHandle = { name: 'garden.json' } as FileSystemFileHandle;

  const coordinator = usePlanSaveCoordinator();
  store.plants.push({
    id: 'p1',
    speciesId: 'comfrey',
    cultivarId: null,
  });

  expect(coordinator.hasUnsavedChanges).toBe(false);
});

it('flushes local save through the local-file integration', async () => {
  const store = usePermaplannerStore();
  const write = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const createWritable = vi.fn().mockResolvedValue({ write, close });
  const getFile = vi.fn().mockResolvedValue({ lastModified: 1000 });
  store.fileHandle = {
    name: 'garden.json',
    createWritable,
    getFile,
  } as unknown as FileSystemFileHandle;

  const coordinator = usePlanSaveCoordinator();
  coordinator.syncPersistedBaseline();
  store.plants.push({
    id: 'p1',
    speciesId: 'comfrey',
    cultivarId: null,
  });

  await coordinator.scheduleFlush();

  expect(createWritable).toHaveBeenCalled();
  expect(coordinator.views.find((v) => v.id === 'local-file')?.status).toBe('saved');
});

it('scheduleFlushAfterLocalWrite does not write when nothing changed', async () => {
  const store = usePermaplannerStore();
  const write = vi.fn().mockResolvedValue(undefined);
  const close = vi.fn().mockResolvedValue(undefined);
  const createWritable = vi.fn().mockResolvedValue({ write, close });
  const getFile = vi.fn().mockResolvedValue({ lastModified: 1000 });
  store.fileHandle = {
    name: 'garden.json',
    createWritable,
    getFile,
  } as unknown as FileSystemFileHandle;

  const coordinator = usePlanSaveCoordinator();
  coordinator.syncPersistedBaseline();
  createWritable.mockClear();

  await coordinator.scheduleFlushAfterLocalWrite();

  expect(createWritable).not.toHaveBeenCalled();
});

it('serializes overlapping flush and single-integration saves', async () => {
  const store = usePermaplannerStore();
  const order: string[] = [];
  const write = vi.fn().mockImplementation(async () => {
    order.push('local-write');
  });
  const close = vi.fn().mockResolvedValue(undefined);
  const createWritable = vi.fn().mockResolvedValue({ write, close });
  const getFile = vi.fn().mockResolvedValue({ lastModified: 1000 });
  store.fileHandle = {
    name: 'garden.json',
    createWritable,
    getFile,
  } as unknown as FileSystemFileHandle;

  const coordinator = usePlanSaveCoordinator();
  coordinator.syncPersistedBaseline();
  store.plants.push({
    id: 'p1',
    speciesId: 'comfrey',
    cultivarId: null,
  });

  const flushDone = coordinator.scheduleFlush();
  const singleDone = coordinator.saveIntegration('local-file');
  await Promise.all([flushDone, singleDone]);

  const writeIndices = order
    .map((label, index) => (label === 'local-write' ? index : -1))
    .filter((index) => index >= 0);
  expect(writeIndices.length).toBeGreaterThanOrEqual(2);
  for (let i = 1; i < writeIndices.length; i++) {
    expect(writeIndices[i]!).toBeGreaterThan(writeIndices[i - 1]!);
  }
});
