import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { GARDEN_DOCUMENT_VERSION, type GardenDocument } from './gardenDocument';
import { useMapScaleStore } from './useMapScaleStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { usePermaplannerStore } from './usePermaplannerStore';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('snapshotForServer omits backgroundImage when unchanged', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = 'data:image/png;base64,abc';
  store.backgroundImageSavedDataUrl = 'data:image/png;base64,abc';

  expect(store.snapshotForServer()).not.toHaveProperty('backgroundImage');
  expect(store.snapshot()).toMatchObject({
    backgroundImage: 'data:image/png;base64,abc',
  });
});

it('snapshotForServer includes backgroundImage when changed', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = 'data:image/png;base64,new';
  store.backgroundImageSavedDataUrl = 'data:image/png;base64,old';

  expect(store.snapshotForServer()).toMatchObject({
    backgroundImage: 'data:image/png;base64,new',
  });
});

it('snapshotForServer sends null when background was cleared', () => {
  const store = usePermaplannerStore();
  store.backgroundImageDataUrl = undefined;
  store.backgroundImageSavedDataUrl = 'data:image/png;base64,old';

  expect(store.snapshotForServer()).toMatchObject({
    backgroundImage: null,
  });
});

it('round-trips every editable field without retaining document or snapshot references', async () => {
  const store = usePermaplannerStore();
  const scale = useMapScaleStore();
  const document: GardenDocument = {
    version: GARDEN_DOCUMENT_VERSION,
    syncRevision: 8,
    landmarks: [],
    plotBorder: [],
    plants: [{ id: 'p1', speciesId: 'apple', cultivarId: null }],
    guilds: [
      { id: 'g1', name: 'Bed', path: [{ x: 1, y: 2 }], plants: [], mulchLevel: 3 },
    ],
    mapScale: {
      unit: 'm',
      start: { x: 3, y: 4 },
      end: { x: 9, y: 12 },
      linePhysicalLength: 5,
    },
    backgroundOpacity: 0.7,
    backgroundImage: 'data:image/png;base64,abc',
    onboardingState: 'done',
  };
  await store.hydrateFromDocument(document, { id: 'garden', name: 'Garden' });
  expect(store.snapshot()).toEqual(document);
  expect(scale).toMatchObject({ ...document.mapScale, unitLengthPx: 2 });

  const exported = store.snapshot();
  exported.guilds.splice(0);
  document.plants.splice(0);
  document.mapScale.start.x = 100;
  expect(store.snapshot()).toMatchObject({
    landmarks: [],
    plotBorder: [],
    plants: [{ id: 'p1' }],
    guilds: [{ id: 'g1' }],
    mapScale: { unit: 'm', start: { x: 3, y: 4 } },
  });

  const history = usePlanCommandHistory();
  scale.movePoint('start', { x: 6, y: 8 });
  store.setSyncRevision(9);
  history.undo();
  expect(scale.start).toEqual({ x: 3, y: 4 });
  expect(store).toMatchObject({
    gardenId: 'garden',
    gardenName: 'Garden',
    syncRevision: 9,
  });
  history.redo();
  expect(scale.start).toEqual({ x: 6, y: 8 });

  await store.resetToNewPlan();
  expect(store.snapshot()).toEqual({
    version: GARDEN_DOCUMENT_VERSION,
    syncRevision: 0,
    landmarks: [],
    plotBorder: [],
    plants: [],
    guilds: [],
    mapScale: {
      unit: 'm',
      start: { x: 20, y: 20 },
      end: { x: 150, y: 20 },
      linePhysicalLength: 1,
    },
    backgroundOpacity: 0.4,
    onboardingState: 'initial',
  });
  expect(history).toMatchObject({ canUndo: false, canRedo: false });
  scale.setPhysicalLength(10);
  expect(store.snapshot().mapScale.linePhysicalLength).toBe(10);
});
