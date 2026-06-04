import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';

import { resetPlanSaveSerialQueueForTests } from './planSaveSerialQueue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';

beforeEach(() => {
  setActivePinia(createPinia());
  resetPlanSaveSerialQueueForTests();
});

afterEach(() => {
  vi.useRealTimers();
});

it('leading autosave saves soon after the first edit in a burst', async () => {
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
  coordinator.markIntegrationsSaved();

  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });
  await flushPromises();

  expect(createWritable).toHaveBeenCalledTimes(1);
});

it('does not mark linked destinations unsaved before markIntegrationsSaved', () => {
  const store = usePermaplannerStore();
  store.fileHandle = { name: 'garden.json' } as FileSystemFileHandle;

  const coordinator = usePlanSaveCoordinator();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
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
  coordinator.markIntegrationsSaved();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });
  await flushPromises();

  await coordinator.scheduleFlush();

  expect(createWritable).toHaveBeenCalled();
  expect(coordinator.views.find((v) => v.id === 'local-file')?.status).toBe('saved');
});

it('saveAllLinkedIntegrations writes local file even when nothing changed', async () => {
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
  coordinator.markIntegrationsSaved();
  createWritable.mockClear();

  await coordinator.saveAllLinkedIntegrations();

  expect(createWritable).toHaveBeenCalled();
});

it('scheduleFlushAfterLocalWrite skips when nothing changed', async () => {
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
  coordinator.markIntegrationsSaved();
  createWritable.mockClear();

  await coordinator.scheduleFlushAfterLocalWrite();

  expect(createWritable).not.toHaveBeenCalled();
});

it('autosave trailing edge saves after the debounce when edits continue in a burst', async () => {
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
  coordinator.markIntegrationsSaved();

  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });
  await flushPromises();
  await flushPromises();
  expect(createWritable).toHaveBeenCalledTimes(1);

  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p2',
      speciesId: 'yarrow',
      cultivarId: null,
    });
  });
  await flushPromises();
  expect(createWritable).toHaveBeenCalledTimes(1);

  await new Promise((resolve) => setTimeout(resolve, 60));
  await flushPromises();

  expect(createWritable).toHaveBeenCalledTimes(2);
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
  coordinator.markIntegrationsSaved();
  usePlanCommandHistory().runMutation(() => {
    store.plants.push({
      id: 'p1',
      speciesId: 'comfrey',
      cultivarId: null,
    });
  });
  await flushPromises();

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
