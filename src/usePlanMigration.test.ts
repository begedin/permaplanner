import { beforeEach, expect, it } from 'vitest';

import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import {
  clearPlanMigrationPending,
  hasPlanMigrationPending,
  noteLocalPlanMigrationIfNeeded,
  planMigrationPending,
} from './usePlanMigration';

beforeEach(() => {
  clearPlanMigrationPending();
});

it('hasPlanMigrationPending when local file is below current version', () => {
  noteLocalPlanMigrationIfNeeded({ plants: [], guilds: [] });
  expect(hasPlanMigrationPending(planMigrationPending.value)).toBe(true);
  expect(planMigrationPending.value).toMatchObject({ localFromVersion: 0 });
});

it('clears local pending when file is already current', () => {
  noteLocalPlanMigrationIfNeeded({ plants: [], guilds: [] });
  noteLocalPlanMigrationIfNeeded({
    version: PERMAPLANNER_FILE_VERSION,
    plants: [],
    guilds: [],
    syncRevision: 0,
  });
  expect(planMigrationPending.value).toBeNull();
});
