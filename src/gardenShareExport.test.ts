import { expect, it } from 'vitest';

import summaryFixtureJson from '../test/fixtures/garden_share_summaries.json?raw';

import type { GardenDocument } from './gardenDocument';
import type { Guild } from './gardenTypes';
import {
  buildGardenShareJsonText,
  buildGardenSharePayload,
  buildGardenShareSummary,
} from './gardenShareExport';
import { GARDEN_DOCUMENT_VERSION } from './gardenDocument';

const sampleGuild: Guild = {
  id: 'g1',
  name: 'Edge guild',
  path: [{ x: 10, y: 20 }],
  mulchLevel: 3,
  note: 'North bed',
  plants: [
    {
      id: 'p1',
      plantId: 'basil',
      nameOrCultivar: 'Thai Basil',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      growthPhase: 'young',
      vigor: 4,
    },
  ],
};

const sampleDoc: GardenDocument = {
  version: GARDEN_DOCUMENT_VERSION,
  syncRevision: 1,
  plants: [],
  guilds: [sampleGuild],
  mapScale: {
    start: { x: 1, y: 2 },
    end: { x: 3, y: 4 },
    linePhysicalLength: 5,
  },
  backgroundOpacity: 0.5,
  onboardingState: 'done',
};

// Shared with ExUnit so clipboard JSON and public HTML/JSON follow one contract.
const summaryFixtures: { name: string; guilds: Guild[]; summary: string }[] =
  JSON.parse(summaryFixtureJson);

it.each(summaryFixtures)('formats the shared summary: $name', ({ guilds, summary }) => {
  expect(buildGardenShareSummary(guilds)).toBe(summary);
});

it('buildGardenSharePayload matches the public share JSON shape', () => {
  expect(buildGardenSharePayload('Backyard', sampleDoc)).toMatchObject({
    gardenName: 'Backyard',
    guilds: [sampleGuild],
    summary: expect.stringContaining('Edge guild'),
  });
});

it('buildGardenShareJsonText pretty-prints the share payload', () => {
  const parsed = JSON.parse(buildGardenShareJsonText('Backyard', sampleDoc)) as {
    gardenName: string;
    guilds: Guild[];
    summary: string;
  };

  expect(parsed).toMatchObject({
    gardenName: 'Backyard',
    guilds: [sampleGuild],
    summary: expect.stringContaining('Thai Basil'),
  });
});
