import { useAuthStore } from './useAuthStore';
import { usePermaplannerStore } from '../usePermaplannerStore';
import { useGardenSessionStore } from './useGardenSessionStore';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { GARDEN_DOCUMENT_VERSION, type GardenDocument } from '../gardenDocument';
import { useMapScaleStore } from '../useMapScaleStore';
import { usePlanCommandHistory } from '../usePlanCommandHistory';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('round-trips every editable field without retaining document or snapshot references', async () => {
  const session = useGardenSessionStore();
  const scale = useMapScaleStore();
  const document: GardenDocument = {
    version: GARDEN_DOCUMENT_VERSION,
    syncRevision: 8,
    landmarks: [],
    paths: [],
    plotBorder: [],
    plants: [{ id: 'p1', speciesId: 'apple', cultivarId: null }],
    guilds: [
      { id: 'g1', name: 'Bed', path: [[[{ x: 1, y: 2 }]]], plants: [], mulchLevel: 3 },
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
  await session.hydrateFromDocument(document, { id: 'garden', name: 'Garden' });
  expect(session.snapshot()).toEqual(document);
  expect(scale).toMatchObject({ ...document.mapScale, unitLengthPx: 2 });

  const exported = session.snapshot();
  exported.guilds.splice(0);
  document.plants.splice(0);
  document.mapScale.start.x = 100;
  expect(session.snapshot()).toMatchObject({
    landmarks: [],
    paths: [],
    plotBorder: [],
    plants: [{ id: 'p1' }],
    guilds: [{ id: 'g1' }],
    mapScale: { unit: 'm', start: { x: 3, y: 4 } },
  });

  const history = usePlanCommandHistory();
  scale.movePoint('start', { x: 6, y: 8 });
  session.syncRevision = 9;
  history.undo();
  expect(scale.start).toEqual({ x: 3, y: 4 });
  expect(session).toMatchObject({
    gardenId: 'garden',
    gardenName: 'Garden',
    syncRevision: 9,
  });
  history.redo();
  expect(scale.start).toEqual({ x: 6, y: 8 });

  await session.reset();
  expect(session.snapshot()).toEqual({
    version: GARDEN_DOCUMENT_VERSION,
    syncRevision: 0,
    landmarks: [],
    paths: [],
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
  expect(session.snapshot().mapScale.linePhysicalLength).toBe(10);
});

it('installs a document synchronously and records the very next edit', () => {
  useAuthStore().user = { id: 'user', email: 'test@example.com', totpConfirmed: true };
  const session = useGardenSessionStore();
  const background = usePermaplannerStore();
  const history = usePlanCommandHistory();
  background.setBackgroundOpacity(0.9);
  session.hydrateFromDocument(
    { ...session.snapshot(), syncRevision: 7, backgroundOpacity: 0.6 },
    { id: 'garden', name: 'Garden' },
  );
  expect(session).toMatchObject({ gardenId: 'garden', syncRevision: 7, status: 'saved' });
  expect(history).toMatchObject({ canUndo: false, canRedo: false });

  background.setBackgroundOpacity(0.8);
  expect(session.canSave).toBe(true);
  history.undo();
  expect(background.backgroundOpacity).toBe(0.6);
  expect(session).toMatchObject({ canSave: false, syncRevision: 7 });
  history.redo();
  expect(background.backgroundOpacity).toBe(0.8);
});
