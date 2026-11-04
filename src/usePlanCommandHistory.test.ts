import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import type { Guild } from './gardenTypes';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanStateStore } from './usePlanStateStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

beforeEach(() => {
  setActivePinia(createPinia());
});

const testGuild = (): Guild => ({
  id: 'g1',
  name: 'Bed',
  path: [{ x: 1, y: 2 }],
  plants: [],
  mulchLevel: 1,
});

it('runMutation records undo and redo for guild edits', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();

  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  expect(store.guilds).toEqual([testGuild()]);

  history.undo();
  expect(store.guilds).toEqual([]);

  history.redo();
  expect(store.guilds).toEqual([testGuild()]);
});

it('clear drops undo and redo stacks', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();

  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  history.runMutation(() => {
    store.backgroundOpacity = 0.8;
  });
  history.undo();
  expect(history).toMatchObject({ canUndo: true, canRedo: true });
  history.clear();
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
});

it('keeps redo available after a no-op but clears it after a new edit', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  history.undo();
  history.runMutation(() => {
    store.guilds = [];
  });
  expect(history).toMatchObject({ canUndo: false, canRedo: true });
  history.runMutation(() => {
    store.guilds = [{ ...testGuild(), name: 'New bed' }];
  });
  expect(history).toMatchObject({ canUndo: true, canRedo: false });
  history.undo();
  expect(store.guilds).toEqual([]);
});

it('applies edits without recording during bulk plan updates', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const before = usePlanStateStore().capture();
  store.isBulkPlanUpdate = true;
  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  history.commitSnapshot(before);
  expect(store.guilds).toEqual([testGuild()]);
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
});

it('does not merge a gesture across another edit', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const token = Symbol('gesture');
  history.runMutation(() => {
    store.backgroundOpacity = 0.5;
  }, token);
  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  history.runMutation(() => {
    store.backgroundOpacity = 0.6;
  }, token);
  history.undo();
  expect(store).toMatchObject({ backgroundOpacity: 0.5, guilds: [testGuild()] });
  history.undo();
  expect(store).toMatchObject({ backgroundOpacity: 0.5, guilds: [] });
  history.undo();
  expect(store.backgroundOpacity).toBe(0.4);
});

it('removes a merged gesture that returns to its starting value', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const token = Symbol('gesture');
  history.runMutation(() => {
    store.backgroundOpacity = 0.8;
  }, token);
  history.runMutation(() => {
    store.backgroundOpacity = 0.4;
  }, token);
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
});
