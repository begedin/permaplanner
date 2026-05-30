import { expect, it } from 'vitest';

import {
  buildGithubPlanShardExports,
  buildLocalPlanJsonText,
} from './permaplannerFileExport';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import type { PermaplannerFileV1 } from './usePermaplannerStore';

const sampleDoc: PermaplannerFileV1 = {
  version: PERMAPLANNER_FILE_VERSION,
  syncRevision: 1,
  plants: [],
  guilds: [],
  mapScale: {
    start: { x: 1, y: 2 },
    end: { x: 3, y: 4 },
    linePhysicalLength: 5,
  },
  backgroundOpacity: 0.5,
};

it('buildLocalPlanJsonText includes current version', () => {
  const parsed = JSON.parse(buildLocalPlanJsonText(sampleDoc)) as PermaplannerFileV1;
  expect(parsed).toMatchObject({ version: PERMAPLANNER_FILE_VERSION, syncRevision: 1 });
});

it('buildGithubPlanShardExports versions each shard file', () => {
  const shards = buildGithubPlanShardExports(sampleDoc, {
    gardenFolderSegment: 'garden',
  });
  expect(JSON.parse(shards.configJson)).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
  });
  expect(JSON.parse(shards.plantsJson)).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    plants: [],
  });
  expect(JSON.parse(shards.guildsJson)).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    guilds: [],
    guildLocations: [],
  });
});

it('buildLocalPlanJsonText writes split guild fields', () => {
  const parsed = JSON.parse(buildLocalPlanJsonText(sampleDoc)) as Record<string, unknown>;
  expect(parsed).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    guilds: [],
    guildLocations: [],
  });
});

it('buildLocalPlanJsonText resolves guild plant names from plant records', () => {
  const snapshot: PermaplannerFileV1 = {
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

  const parsed = JSON.parse(buildLocalPlanJsonText(snapshot)) as {
    guilds: { plants: { name: string }[] }[];
  };
  expect(parsed.guilds[0]!.plants[0]!.name).toBe('Thai Basil');
});

it('buildGithubPlanShardExports resolves guild plant names from plant records', () => {
  const snapshot: PermaplannerFileV1 = {
    ...sampleDoc,
    plants: [
      {
        id: 'up-1',
        speciesId: 'unknown',
        cultivarId: null,
        speciesOverride: { name: 'Lemon Balm' },
      },
    ],
    guilds: [
      {
        id: 'g-1',
        name: 'Tea guild',
        path: [],
        mulchLevel: 3,
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

  const shards = buildGithubPlanShardExports(snapshot, {
    gardenFolderSegment: 'tea-guild',
  });
  const guilds = JSON.parse(shards.guildsJson) as {
    guilds: { plants: { name: string }[] }[];
  };
  expect(guilds.guilds[0]!.plants[0]!.name).toBe('Lemon Balm');
});
