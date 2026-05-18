import { expect, it } from 'vitest';

import {
  documentNeedsMigration,
  guildsArrayFromShard,
  migratePlanDocumentRaw,
  plantsArrayFromShard,
  readDocumentVersion,
} from './permaplannerFileMigrate';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import { parsePermaplannerDocument } from './usePermaplannerStore';

it('documentNeedsMigration is true below current version', () => {
  expect(documentNeedsMigration({ plants: [] })).toBe(true);
  expect(documentNeedsMigration({ version: PERMAPLANNER_FILE_VERSION, plants: [] })).toBe(false);
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
  const legacy = [{ id: 'apple_granny_smith', speciesId: 'apple', cultivarId: 'granny_smith' }];
  expect(await plantsArrayFromShard({ plants: legacy })).toEqual(legacy);
  expect(await plantsArrayFromShard({ version: PERMAPLANNER_FILE_VERSION, plants: legacy })).toEqual(
    legacy,
  );
});

it('guildsArrayFromShard accepts unversioned GitHub guilds.json', async () => {
  const legacy = [{ id: 'g1', name: 'Guild', path: [], plants: [], mulchLevel: 1 }];
  expect(await guildsArrayFromShard({ guilds: legacy })).toEqual(legacy);
});

it('parsePermaplannerDocument returns current version after migration', async () => {
  const doc = await parsePermaplannerDocument({ plants: [], guilds: [] });
  expect(doc.version).toBe(PERMAPLANNER_FILE_VERSION);
});
