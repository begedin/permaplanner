import { setActivePinia } from 'pinia';
import { createPinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';

import { parseGardenDocument } from './gardenDocument';
import { buildLocalPlanJsonText } from './permaplannerFileExport';
import { usePermaplannerStore } from './usePermaplannerStore';
import type { Guild } from './gardenTypes';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('hydrates from document snapshot round-trip', async () => {
  const store = usePermaplannerStore();
  const guild: Guild = {
    id: 'g-willow',
    name: 'Willow',
    path: [{ x: 1, y: 2 }],
    plants: [],
    mulchLevel: 1,
  };
  store.guilds = [guild];
  store.gardenId = 'g1';
  store.gardenName = 'garden.json';

  const snap = store.snapshot();
  const parsed = await parseGardenDocument(JSON.parse(buildLocalPlanJsonText(snap)));

  setActivePinia(createPinia());
  const reloaded = usePermaplannerStore();
  await reloaded.hydrateFromDocument(parsed, { id: 'g1', name: 'garden.json' });

  expect(reloaded.gardenName).toBe('garden.json');
  expect(reloaded.guilds).toEqual([guild]);
});
