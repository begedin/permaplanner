import { expect, it } from 'vitest';

import { buildLocalPlanJsonText } from './permaplannerFileExport';
import { GARDEN_DOCUMENT_VERSION } from './gardenDocument';
import type { GardenDocument } from './gardenDocument';

const sampleDoc: GardenDocument = {
  version: GARDEN_DOCUMENT_VERSION,
  syncRevision: 1,
  plants: [],
  guilds: [],
  mapScale: {
    start: { x: 1, y: 2 },
    end: { x: 3, y: 4 },
    linePhysicalLength: 5,
  },
  backgroundOpacity: 0.5,
  onboardingState: 'done',
};

it('buildLocalPlanJsonText includes current version', () => {
  const parsed = JSON.parse(buildLocalPlanJsonText(sampleDoc)) as GardenDocument;
  expect(parsed).toMatchObject({ version: GARDEN_DOCUMENT_VERSION, syncRevision: 1 });
});

it('buildLocalPlanJsonText resolves guild plant names from plant records', () => {
  const snapshot: GardenDocument = {
    ...sampleDoc,
    plants: [
      {
        id: 'up-1',
        speciesId: 'unknown',
        cultivarId: null,
        speciesOverride: { name: 'Thai Basil' },
      },
    ],
    guilds: [
      {
        id: 'g-1',
        name: 'Herbs',
        path: [],
        mulchLevel: 2,
        plants: [
          {
            id: 'thing-1',
            plantId: 'up-1',
            nameOrCultivar: 'Plant',
            x: 0,
            y: 0,
            width: 1,
            height: 1,
          },
        ],
      },
    ],
  };

  expect(JSON.parse(buildLocalPlanJsonText(snapshot))).toMatchObject({
    guilds: [{ plants: [{ nameOrCultivar: 'Thai Basil' }] }],
  });
});
