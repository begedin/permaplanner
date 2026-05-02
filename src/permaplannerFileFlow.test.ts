import { flushPromises } from '@vue/test-utils';
import { beforeEach, expect, it, vi } from 'vitest';
import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';

import { usePermaplannerStore } from './usePermaplannerStore';
import type { Guild } from './gardenTypes';

vi.mock('./sessionFileHandle', () => ({
  clearFileBinding: vi.fn().mockResolvedValue(undefined),
  persistFileBinding: vi.fn().mockResolvedValue(undefined),
}));

const fileLabel = 'garden.json';

type Disk = { get value(): string; set(s: string): void };

const createDisk = (): Disk => {
  let v = '';
  return {
    get value() {
      return v;
    },
    set(s: string) {
      v = s;
    },
  };
};

let disk: Disk;

beforeEach(() => {
  disk = createDisk();
  setActivePinia(createPinia());
});

it('new plan, save, change, save, then load again like after a refresh', async () => {
  const makeHandle = (): FileSystemFileHandle => {
    return {
      name: fileLabel,
      getFile: () =>
        Promise.resolve({
          name: fileLabel,
          text: () => Promise.resolve(disk.value),
        } as File),
      createWritable: () => {
        let last = '';
        return Promise.resolve({
          write: (data: string) => {
            last = data;
            return Promise.resolve();
          },
          close: () => {
            disk.set(last);
            return Promise.resolve();
          },
        });
      },
    } as FileSystemFileHandle;
  };

  const store = usePermaplannerStore();
  await store.resetToNewPlan();
  await store.save(makeHandle());
  expect(store.guilds).toHaveLength(0);

  const guild: Guild = { id: 'g-willow', name: 'Willow', path: [{ x: 1, y: 2 }], plants: [], mulchLevel: 1 };
  store.guilds = [guild];
  await store.save(makeHandle());

  setActivePinia(createPinia());
  const reloaded = usePermaplannerStore();
  expect(reloaded.guilds).toHaveLength(0);

  await reloaded.load(makeHandle(), { skipBindingPersist: true });

  expect(reloaded).toMatchObject({
    fileName: fileLabel,
    guilds: [guild],
  });
});

it('auto-saves guild changes to the linked file after the debounce', async () => {
  vi.useFakeTimers();
  const makeHandle = (): FileSystemFileHandle => {
    return {
      name: fileLabel,
      getFile: () =>
        Promise.resolve({
          name: fileLabel,
          text: () => Promise.resolve(disk.value),
        } as File),
      createWritable: () => {
        let last = '';
        return Promise.resolve({
          write: (data: string) => {
            last = data;
            return Promise.resolve();
          },
          close: () => {
            disk.set(last);
            return Promise.resolve();
          },
        });
      },
    } as FileSystemFileHandle;
  };

  const store = usePermaplannerStore();
  await store.resetToNewPlan();
  await store.save(makeHandle());

  const autoGuild = { id: 'g-auto', name: 'Autosaved guild', path: [], plants: [], mulchLevel: 1 };
  store.guilds = [autoGuild];
  await flushPromises();
  await vi.advanceTimersByTimeAsync(350);

  setActivePinia(createPinia());
  const reloaded = usePermaplannerStore();
  await reloaded.load(makeHandle(), { skipBindingPersist: true });

  expect(reloaded.guilds).toEqual([autoGuild]);
  vi.useRealTimers();
});
