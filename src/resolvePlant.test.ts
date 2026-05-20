import { expect, it } from 'vitest';
import { plantCatalog } from './plantCatalog';
import {
  normalizePlantsFromFile,
  plantGuildGroupLabel,
  resolveUserPlant,
} from './resolvePlant';
import type { Plant, UserPlant } from './gardenTypes';

it('merges db species → species override → cultivar → cultivar override', () => {
  const user: UserPlant = {
    id: 'u1',
    speciesId: 'apple',
    cultivarId: 'granny_smith',
    speciesOverride: { emoji: '🟢' },
    cultivarOverride: { name: 'GS (mine)' },
  };
  const r = resolveUserPlant(user, plantCatalog);
  expect(r.emoji).toBe('🟢');
  expect(r.cultivar).toBe('GS (mine)');
  expect(r.name).toBe('Apple');
});

it('guild group label is species only for default cultivar', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'basil',
    cultivarId: null,
    name: 'Basil',
    cultivar: null,
    emoji: '🌿',
    functions: [],
    layers: [],
  };
  expect(plantGuildGroupLabel(p)).toBe('Basil');
});

it('guild group label is species and cultivar when a cultivar is selected', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'basil',
    cultivarId: 'genovese',
    name: 'Basil',
    cultivar: 'Genovese',
    emoji: '🌿',
    functions: [],
    layers: [],
  };
  expect(plantGuildGroupLabel(p)).toBe('Basil, Genovese');
});

it('migrates legacy plan rows to user plants', () => {
  const raw = [
    {
      id: 'apple_granny_smith',
      name: 'Apple',
      cultivar: 'Granny Smith',
      background: 'bg_1',
      feature: 'apple',
      feature_tint: '#00DD00',
      functions: [],
      layers: [],
    },
  ];
  const migrated = normalizePlantsFromFile(raw, plantCatalog);
  expect(migrated[0]).toMatchObject({
    id: 'apple_granny_smith',
    speciesId: 'apple',
    cultivarId: 'granny_smith',
  });
});
