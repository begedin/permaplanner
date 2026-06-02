import { expect, it } from 'vitest';

import type { Guild } from './gardenTypes';
import {
  mergeGuildsFromPersistence,
  splitGuildsForPersistence,
  splitGuildFieldsOnDocument,
} from './guildPersistence';
import { migrateGuildsShardRaw, migratePlanDocumentRaw } from './permaplannerFileMigrate';
import { buildLocalPlanJsonText } from './permaplannerFileExport';
import type { PermaplannerFileV1 } from './usePermaplannerStore';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';

const sampleGuild: Guild = {
  id: 'g1',
  name: 'Edge guild',
  path: [{ x: 10, y: 20 }],
  mulchLevel: 3,
  plants: [
    {
      id: 't1',
      nameOrCultivar: 'Granny Smith',
      plantId: 'apple_granny_smith',
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    },
  ],
};

it('splitGuildsForPersistence separates content from map layout', () => {
  const guildWithStatus: Guild = {
    ...sampleGuild,
    plants: [
      {
        ...sampleGuild.plants[0]!,
        growthPhase: 'young',
        vigor: 4,
      },
    ],
  };
  const { guilds, guildLocations } = splitGuildsForPersistence([guildWithStatus]);
  expect(guilds).toEqual([
    {
      id: 'g1',
      name: 'Edge guild',
      mulchLevel: 3,
      plants: [
        {
          id: 't1',
          name: 'Granny Smith',
          plantId: 'apple_granny_smith',
          growthPhase: 'young',
          vigor: 4,
        },
      ],
    },
  ]);
  expect(guildLocations).toEqual([
    {
      id: 'g1',
      path: [{ x: 10, y: 20 }],
      plants: [{ id: 't1', x: 1, y: 2, width: 3, height: 4 }],
    },
  ]);
});

it('splitGuildsForPersistence omits unset phase and vigor', () => {
  const { guilds, guildLocations } = splitGuildsForPersistence([sampleGuild]);
  expect(guilds).toEqual([
    {
      id: 'g1',
      name: 'Edge guild',
      mulchLevel: 3,
      plants: [{ id: 't1', name: 'Granny Smith', plantId: 'apple_granny_smith' }],
    },
  ]);
  expect(guildLocations).toEqual([
    {
      id: 'g1',
      path: [{ x: 10, y: 20 }],
      plants: [{ id: 't1', x: 1, y: 2, width: 3, height: 4 }],
    },
  ]);
});

it('mergeGuildsFromPersistence round-trips split shards', () => {
  const split = splitGuildsForPersistence([sampleGuild]);
  expect(mergeGuildsFromPersistence(split.guilds, split.guildLocations)).toEqual([
    sampleGuild,
  ]);
});

it('splitGuildsForPersistence omits empty guild notes', () => {
  const { guilds } = splitGuildsForPersistence([{ ...sampleGuild, note: '' }]);
  expect(guilds[0]).not.toHaveProperty('note');
});

it('splitGuildsForPersistence includes non-empty guild notes', () => {
  const { guilds } = splitGuildsForPersistence([
    { ...sampleGuild, note: 'North edge planting plan' },
  ]);
  expect(guilds[0]).toMatchObject({ note: 'North edge planting plan' });
});

it('mergeGuildsFromPersistence reads optional guild notes', () => {
  const split = splitGuildsForPersistence([
    { ...sampleGuild, note: 'Keep mulch topped up in summer' },
  ]);
  expect(mergeGuildsFromPersistence(split.guilds, split.guildLocations)).toEqual([
    { ...sampleGuild, note: 'Keep mulch topped up in summer' },
  ]);
});

it('mergeGuildsFromPersistence drops empty notes from guild shards', () => {
  const { guildLocations } = splitGuildsForPersistence([sampleGuild]);
  expect(
    mergeGuildsFromPersistence(
      [
        {
          id: 'g1',
          name: 'Edge guild',
          mulchLevel: 3,
          note: '',
          plants: [{ id: 't1', name: 'Granny Smith', plantId: 'apple_granny_smith' }],
        },
      ],
      guildLocations,
    )[0],
  ).not.toHaveProperty('note');
});

it('buildLocalPlanJsonText omits empty guild notes from saved JSON', () => {
  const snapshot: PermaplannerFileV1 = {
    version: PERMAPLANNER_FILE_VERSION,
    syncRevision: 0,
    plants: [],
    guilds: [{ ...sampleGuild, note: '' }],
    mapScale: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      linePhysicalLength: 1,
    },
    backgroundOpacity: 0.4,
    onboardingState: 'done',
  };
  expect(buildLocalPlanJsonText(snapshot)).not.toContain('"note"');
});

it('migrateGuildsShardRaw splits v2 merged guilds.json to v3', async () => {
  const migrated = await migrateGuildsShardRaw({
    version: 2,
    guilds: [sampleGuild],
  });
  expect(migrated).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    guilds: [
      {
        id: 'g1',
        name: 'Edge guild',
        mulchLevel: 3,
        plants: [{ id: 't1', name: 'Granny Smith', plantId: 'apple_granny_smith' }],
      },
    ],
    guildLocations: [
      {
        id: 'g1',
        path: [{ x: 10, y: 20 }],
        plants: [{ id: 't1', x: 1, y: 2, width: 3, height: 4 }],
      },
    ],
  });
});

it('migratePlanDocumentRaw splits guilds on monolithic v2 saves', async () => {
  const migrated = await migratePlanDocumentRaw({
    version: 2,
    plants: [],
    guilds: [sampleGuild],
    syncRevision: 0,
    mapScale: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      linePhysicalLength: 1,
    },
    backgroundOpacity: 0.4,
  });
  expect(migrated.version).toBe(PERMAPLANNER_FILE_VERSION);
  expect(splitGuildsForPersistence([sampleGuild])).toMatchObject({
    guilds: migrated.guilds,
    guildLocations: migrated.guildLocations,
  });
});

it('splitGuildFieldsOnDocument leaves already-split guild lists unchanged', () => {
  const split = splitGuildsForPersistence([sampleGuild]);
  const doc = splitGuildFieldsOnDocument({
    version: 2,
    guilds: split.guilds,
    guildLocations: split.guildLocations,
  });
  expect(doc).toMatchObject({
    guilds: split.guilds,
    guildLocations: split.guildLocations,
  });
});
