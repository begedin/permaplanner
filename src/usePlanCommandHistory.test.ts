import { setActivePinia, createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import type { Guild } from './gardenTypes';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanStateStore } from './usePlanStateStore';
import { MAX_UNDO_EDITS, usePlanCommandHistory } from './usePlanCommandHistory';

beforeEach(() => {
  setActivePinia(createPinia());
});

const testGuild = (): Guild => ({
  id: 'g1',
  name: 'Bed',
  path: [[[{ x: 1, y: 2 }]]],
  plants: [],
  mulchLevel: 1,
});

it('runMutation records undo and redo for guild edits', () => {
  const history = usePlanCommandHistory();

  history.runMutation(() => {
    usePlanStateStore().state.guilds = [testGuild()];
  });
  expect(usePlanStateStore().state.guilds).toEqual([testGuild()]);

  history.undo();
  expect(usePlanStateStore().state.guilds).toEqual([]);

  history.redo();
  expect(usePlanStateStore().state.guilds).toEqual([testGuild()]);
});

it('clear drops undo and redo stacks', () => {
  const history = usePlanCommandHistory();

  history.runMutation(() => {
    usePlanStateStore().state.guilds = [testGuild()];
  });
  history.runMutation(() => {
    usePlanStateStore().state.backgroundOpacity = 0.8;
  });
  history.undo();
  expect(history).toMatchObject({ canUndo: true, canRedo: true });
  history.clear();
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
});

it('keeps redo available after a no-op but clears it after a new edit', () => {
  const history = usePlanCommandHistory();
  history.runMutation(() => {
    usePlanStateStore().state.guilds = [testGuild()];
  });
  history.undo();
  history.runMutation(() => {
    usePlanStateStore().state.guilds = [];
  });
  expect(history).toMatchObject({ canUndo: false, canRedo: true });
  history.runMutation(() => {
    usePlanStateStore().state.guilds = [{ ...testGuild(), name: 'New bed' }];
  });
  expect(history).toMatchObject({ canUndo: true, canRedo: false });
  history.undo();
  expect(usePlanStateStore().state.guilds).toEqual([]);
});

it('does not merge a gesture across another edit', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const token = Symbol('gesture');
  history.runMutation(() => {
    usePlanStateStore().state.backgroundOpacity = 0.5;
  }, token);
  history.runMutation(() => {
    usePlanStateStore().state.guilds = [testGuild()];
  });
  history.runMutation(() => {
    usePlanStateStore().state.backgroundOpacity = 0.6;
  }, token);
  history.undo();
  expect(store).toMatchObject({ backgroundOpacity: 0.5, guilds: [testGuild()] });
  history.undo();
  expect(store).toMatchObject({ backgroundOpacity: 0.5, guilds: [] });
  history.undo();
  expect(usePlanStateStore().state.backgroundOpacity).toBe(0.4);
});

it('removes a merged gesture that returns to its starting value', () => {
  const history = usePlanCommandHistory();
  const token = Symbol('gesture');
  history.runMutation(() => {
    usePlanStateStore().state.backgroundOpacity = 0.8;
  }, token);
  history.runMutation(() => {
    usePlanStateStore().state.backgroundOpacity = 0.4;
  }, token);
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
});

it('bounds undo history and retains redo through the surviving timeline', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  for (let value = 1; value <= MAX_UNDO_EDITS + 2; value++) {
    history.runMutation(() => {
      plan.state.mapScale.linePhysicalLength = value;
    });
  }
  let undos = 0;
  while (history.canUndo) {
    history.undo();
    undos++;
  }
  expect({ undos, length: plan.state.mapScale.linePhysicalLength }).toEqual({
    undos: MAX_UNDO_EDITS,
    length: 2,
  });
  while (history.canRedo) history.redo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(MAX_UNDO_EDITS + 2);
});

it('coalesces gestures at the history limit and keeps the preceding edit after a reversal', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  for (let value = 2; value <= MAX_UNDO_EDITS + 1; value++) {
    history.runMutation(() => {
      plan.state.mapScale.linePhysicalLength = value;
    });
  }
  const token = Symbol('slider');
  history.runMutation(() => {
    plan.state.backgroundOpacity = 0.5;
  }, token);
  history.runMutation(() => {
    plan.state.backgroundOpacity = 0.4;
  }, token);
  history.runMutation(() => {
    plan.state.backgroundOpacity = 0.6;
  }, token);
  history.undo();
  expect(plan.state).toMatchObject({
    backgroundOpacity: 0.4,
    mapScale: { linePhysicalLength: MAX_UNDO_EDITS + 1 },
  });
  history.undo();
  expect(plan.state.mapScale.linePhysicalLength).toBe(MAX_UNDO_EDITS);
});

it('records nested actions as one edit and rolls back a failed action', () => {
  const plan = usePlanStateStore();
  const history = usePlanCommandHistory();
  const background = usePermaplannerStore();
  history.runMutation(() => {
    background.setBackgroundOpacity(0.7);
    background.setBackgroundImage('data:image/png;base64,new');
  });
  const saved = plan.capture();
  expect(() =>
    history.runMutation(() => {
      background.setBackgroundOpacity(0.9);
      throw new Error('failed');
    }),
  ).toThrow('failed');
  expect(plan.capture()).toEqual(saved);
  history.undo();
  expect(plan.state).toMatchObject({
    backgroundOpacity: 0.4,
    backgroundImageDataUrl: undefined,
  });
  expect(history.canUndo).toBe(false);
});
