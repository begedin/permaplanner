import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import type { GardenDocument } from './gardenDocument';
import { buildLocalPlanJsonText } from './permaplannerFileExport';
import { usePermaplannerStore } from './usePermaplannerStore';
import { useMapScaleStore } from './useMapScaleStore';
import type { Guild } from './gardenTypes';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('hydrates from document snapshot round-trip', async () => {
  const store = usePermaplannerStore();
  const guild: Guild = {
    id: 'g-willow',
    name: 'Willow',
    path: [{ x: 1, y: 2 }],
    plants: [],
    mulchLevel: 1,
  };
  store.guilds = [guild];
  store.landmarks = [
    { id: 'house', name: 'House', x: 100, y: 50, width: 80, height: 40, rotation: 35 },
  ];
  useMapScaleStore().setUnit('ft');
  store.gardenId = 'g1';
  store.gardenName = 'garden.json';

  const snap = store.snapshot();
  const parsed = JSON.parse(buildLocalPlanJsonText(snap)) as GardenDocument;

  setActivePinia(createPinia());
  const reloaded = usePermaplannerStore();
  await reloaded.hydrateFromDocument(parsed, { id: 'g1', name: 'garden.json' });

  expect(reloaded.gardenName).toBe('garden.json');
  expect(reloaded.snapshot()).toEqual(snap);
});
