import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';
import { rectangleShapePath } from './mapShapeGeometry';
import { useMapShapeStore } from './useMapShapeStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePlanStateStore } from './usePlanStateStore';

beforeEach(() => setActivePinia(createPinia()));

it('keeps equal IDs in separate collections and restores shape edits through history', () => {
  const store = useMapShapeStore();
  const history = usePlanCommandHistory();
  const shape = {
    id: 'same-id',
    name: 'Original',
    x: 10,
    y: 20,
    width: 40,
    height: 50,
    rotation: 0,
    path: rectangleShapePath(),
  };
  store.save('landmark', shape);
  store.save('path', shape);
  // Mutating a caller-owned outline must not alter either saved collection.
  shape.path.length = 0;
  const saved = { ...shape, path: rectangleShapePath() };
  const renamed = { ...saved, name: 'Walkway' };
  store.save('path', renamed);
  expect(usePlanStateStore().state).toMatchObject({
    landmarks: [saved],
    paths: [renamed],
  });
  store.remove('path', shape.id);
  expect(store.items('path')).toEqual([]);
  history.undo();
  expect(store.items('path')).toEqual([renamed]);
  history.undo();
  expect(store.items('path')).toEqual([saved]);
  history.redo();
  expect(usePlanStateStore().state).toMatchObject({
    landmarks: [saved],
    paths: [renamed],
  });
});
