import { expect, it } from 'vitest';

import { splitGuildsForPersistence } from './guildPersistence';
import {
  documentNeedsMigration,
  guildsArrayFromShard,
  migratePlanDocumentRaw,
  plantsArrayFromShard,
  readDocumentVersion,
} from './permaplannerFileMigrate';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import { parsePermaplannerDocument } from './usePermaplannerStore';
import type { Guild } from './gardenTypes';

it('documentNeedsMigration is true below current version', () => {
  expect(documentNeedsMigration({ plants: [] })).toBe(true);
  expect(documentNeedsMigration({ version: PERMAPLANNER_FILE_VERSION, plants: [] })).toBe(
    false,
  );
});

it('readDocumentVersion treats missing version as 0', () => {
  expect(readDocumentVersion({ plants: [] })).toBe(0);
  expect(readDocumentVersion({ version: 2 })).toBe(2);
});

it('migratePlanDocumentRaw upgrades legacy monolithic saves to current version', async () => {
  const migrated = await migratePlanDocumentRaw({
    plants: [],
    guilds: [],
    backgroundImageDataUrl: 'data:image/png;base64,abc',
  });
  expect(migrated).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    syncRevision: 0,
    backgroundImage: 'data:image/png;base64,abc',
    backgroundOpacity: 0.4,
    mapScale: {
      start: { x: 20, y: 20 },
      end: { x: 150, y: 20 },
      linePhysicalLength: 1,
    },
  });
});

it('plantsArrayFromShard accepts unversioned GitHub plants.json', async () => {
  const legacy = [
    { id: 'apple_granny_smith', speciesId: 'apple', cultivarId: 'granny_smith' },
  ];
  expect(await plantsArrayFromShard({ plants: legacy })).toEqual(legacy);
  expect(
    await plantsArrayFromShard({ version: PERMAPLANNER_FILE_VERSION, plants: legacy }),
  ).toEqual(legacy);
});

it('guildsArrayFromShard migrates and merges legacy merged guilds.json', async () => {
  const legacy = [{ id: 'g1', name: 'Guild', path: [], plants: [], mulchLevel: 1 }];
  expect(await guildsArrayFromShard({ guilds: legacy })).toEqual(legacy);
});

it('guildsArrayFromShard merges v3 split guilds.json', async () => {
  const merged: Guild[] = [
    {
      id: 'g1',
      name: 'Guild',
      path: [{ x: 1, y: 2 }],
      plants: [
        {
          id: 't1',
          nameOrCultivar: 'Apple',
          plantId: 'p1',
          x: 3,
          y: 4,
          width: 5,
          height: 6,
        },
      ],
      mulchLevel: 2,
    },
  ];
  const { guilds, guildLocations } = splitGuildsForPersistence(merged);
  expect(await guildsArrayFromShard({ version: 3, guilds, guildLocations })).toEqual(
    merged,
  );
});

it('parsePermaplannerDocument keeps aerial geometry from split GitHub guild shards', async () => {
  const merged: Guild[] = [
    {
      id: 'g1',
      name: 'Guild',
      path: [{ x: 1, y: 2 }],
      plants: [
        {
          id: 't1',
          nameOrCultivar: 'Apple',
          plantId: 'p1',
          x: 3,
          y: 4,
          width: 5,
          height: 6,
        },
      ],
      mulchLevel: 2,
    },
  ];
  const { guilds, guildLocations } = splitGuildsForPersistence(merged);

  const doc = await parsePermaplannerDocument({
    version: PERMAPLANNER_FILE_VERSION,
    syncRevision: 1,
    mapScale: {
      start: { x: 10, y: 20 },
      end: { x: 110, y: 20 },
      linePhysicalLength: 25,
    },
    backgroundOpacity: 0.55,
    backgroundImage: 'data:image/png;base64,abc',
    plants: [],
    guilds,
    guildLocations,
  });

  expect(doc).toMatchObject({
    mapScale: {
      start: { x: 10, y: 20 },
      end: { x: 110, y: 20 },
      linePhysicalLength: 25,
    },
    backgroundOpacity: 0.55,
    backgroundImage: 'data:image/png;base64,abc',
    guilds: merged,
  });
});

it('parsePermaplannerDocument returns current version after migration', async () => {
  const doc = await parsePermaplannerDocument({ plants: [], guilds: [] });
  expect(doc.version).toBe(PERMAPLANNER_FILE_VERSION);
});

it('migratePlanDocumentRaw v4 → v5 adds onboardingState done for existing plans', async () => {
  const migrated = await migratePlanDocumentRaw({
    version: 4,
    syncRevision: 0,
    plants: [],
    guilds: [],
    guildLocations: [],
    mapScale: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      linePhysicalLength: 1,
    },
    backgroundOpacity: 0.4,
  });
  expect(migrated).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    onboardingState: 'done',
  });
});

it('parsePermaplannerDocument keeps a valid onboardingState from the file', async () => {
  const doc = await parsePermaplannerDocument({
    version: 4,
    syncRevision: 0,
    plants: [],
    guilds: [],
    onboardingState: 'movingFirst',
    mapScale: {
      start: { x: 0, y: 0 },
      end: { x: 1, y: 0 },
      linePhysicalLength: 1,
    },
    backgroundOpacity: 0.4,
  });
  expect(doc.onboardingState).toBe('movingFirst');
});

it('migratePlanDocumentRaw converts plant emoji overrides to iconId', async () => {
  const migrated = await migratePlanDocumentRaw({
    version: 3,
    plants: [
      {
        id: 'p1',
        speciesId: 'comfrey',
        cultivarId: null,
        speciesOverride: { emoji: '🪻' },
      },
    ],
    guilds: [],
    guildLocations: [],
  });
  expect(migrated).toMatchObject({
    version: PERMAPLANNER_FILE_VERSION,
    plants: [
      {
        id: 'p1',
        speciesId: 'comfrey',
        cultivarId: null,
        speciesOverride: { iconId: 'flower-spike' },
      },
    ],
  });
});
