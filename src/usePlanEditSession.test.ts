import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanEditSession } from './usePlanEditSession';

beforeEach(() => setActivePinia(createPinia()));

it('records multiple session changes as one undoable edit', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const session = usePlanEditSession();
  const original = store.backgroundOpacity;
  session.begin();
  store.backgroundOpacity = 0.2;
  store.backgroundOpacity = 0.8;
  session.commit();
  session.commit();
  history.undo();
  expect(store.backgroundOpacity).toBe(original);
  expect(history).toMatchObject({ canUndo: false, canRedo: true });
  history.redo();
  expect(store.backgroundOpacity).toBe(0.8);
});

it('discards canceled sessions and captures a fresh starting point next time', () => {
  const store = usePermaplannerStore();
  const history = usePlanCommandHistory();
  const session = usePlanEditSession();
  session.begin();
  store.backgroundOpacity = 0.2;
  session.cancel();
  session.commit();
  expect(history.canUndo).toBe(false);
  session.begin();
  store.backgroundOpacity = 0.8;
  session.commit();
  history.undo();
  expect(store.backgroundOpacity).toBe(0.2);
});
