import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import type { Guild } from './gardenTypes';
import { planSavableStatesEqual } from './planSavableState';
import { usePermaplannerStore } from './usePermaplannerStore';
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

it('does not record commands while bulk plan state is replacing', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();

  store.isBulkPlanUpdate = true;
  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  store.isBulkPlanUpdate = false;

  expect(store.guilds).toEqual([testGuild()]);
  expect(history.canUndo).toBe(false);
});

it('clear drops undo and redo stacks', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();

  history.runMutation(() => {
    store.guilds = [testGuild()];
  });
  history.clear();

  expect(history.canUndo).toBe(false);
  expect(history.canRedo).toBe(false);
});

it('commitSnapshot records a single edit session', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const before = history.capturePlanSavableState();

  store.guilds = [testGuild()];
  history.commitSnapshot(before);

  history.undo();
  expect(store.guilds).toEqual([]);
});

it('planSavableStatesEqual compares background image by reference', () => {
  const history = usePlanCommandHistory();
  const withImage = history.capturePlanSavableState();
  withImage.backgroundImageDataUrl = 'data:image/png;base64,abc';

  const sameImage = { ...withImage };
  const withoutImage = { ...withImage, backgroundImageDataUrl: undefined };

  expect(planSavableStatesEqual(withImage, sameImage)).toBe(true);
  expect(planSavableStatesEqual(withImage, withoutImage)).toBe(false);
});
