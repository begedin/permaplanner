import { expect, it } from 'vitest';

import type { GardenDocument } from './gardenDocument';
import type { Guild } from './gardenTypes';
import {
  buildGardenShareJsonText,
  buildGardenSharePayload,
  buildGardenShareSummary,
} from './gardenShareExport';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';

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
  version: PERMAPLANNER_FILE_VERSION,
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

it('buildGardenShareSummary formats guild blocks like the public share page', () => {
  const summary = buildGardenShareSummary([
    {
      id: 'g1',
      name: 'Edge guild',
      mulchLevel: 3,
      note: 'North bed',
      plants: [{ name: 'Thai Basil', growthPhase: 'young', vigor: 4 }],
    },
  ]);

  expect(summary).toContain('Edge guild');
  expect(summary).toContain('Thai Basil');
  expect(summary).toContain('Healthy (4/5)');
  expect(summary).toContain('Young');
  expect(summary).toContain('mulch level: 3/5');
  expect(summary).toContain('North bed');
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

it('buildGardenShareSummary returns a placeholder for empty guild lists', () => {
  expect(buildGardenShareSummary([])).toBe('(no guilds)');
});
