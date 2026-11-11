import { rectangleLandmarkPath } from './landmarkGeometry';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import { usePlanStateStore } from './usePlanStateStore';
import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import type { GardenDocument } from './gardenDocument';
import { buildLocalPlanJsonText } from './permaplannerFileExport';
import { useMapScaleStore } from './useMapScaleStore';
import type { Guild } from './gardenTypes';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('hydrates from document snapshot round-trip', async () => {
  const guild: Guild = {
    id: 'g-willow',
    name: 'Willow',
    path: [[[{ x: 1, y: 2 }]]],
    plants: [],
    mulchLevel: 1,
  };
  usePlanStateStore().state.guilds = [guild];
  usePlanStateStore().state.plotBorder = [
    [
      [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 100, y: 150 },
        { x: 0, y: 0 },
      ],
    ],
  ];
  usePlanStateStore().state.landmarks = [
    {
      id: 'house',
      name: 'House',
      x: 100,
      y: 50,
      width: 80,
      height: 40,
      rotation: 35,
      path: rectangleLandmarkPath(),
    },
  ];
  useMapScaleStore().setUnit('ft');
  useGardenSessionStore().gardenId = 'g1';
  useGardenSessionStore().gardenName = 'garden.json';

  const snap = useGardenSessionStore().snapshot();
  const parsed = JSON.parse(buildLocalPlanJsonText(snap)) as GardenDocument;

  setActivePinia(createPinia());
  await useGardenSessionStore().hydrateFromDocument(parsed, {
    id: 'g1',
    name: 'garden.json',
  });

  expect(useGardenSessionStore().gardenName).toBe('garden.json');
  expect(useGardenSessionStore().snapshot()).toEqual(snap);
});
