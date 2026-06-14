import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { PERMAPLANNER_FILE_VERSION } from '../permaplannerFileVersion';
import { migrateForImport } from './migrateForImport';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('migrates v0 monolithic document to current version', async () => {
  const raw = {
    plants: [{ id: 'p1', speciesId: 'comfrey', cultivarId: null }],
  };
  const doc = await migrateForImport(raw);
  expect(doc.version).toBe(PERMAPLANNER_FILE_VERSION);
  expect(doc.plants.length).toBeGreaterThan(0);
});
