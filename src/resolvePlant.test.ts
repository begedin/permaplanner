import { expect, it } from 'vitest';
import { plantCatalog } from './plantCatalog';
import {
  normalizePlantsFromFile,
  plantDisplayLabel,
  plantGuildGroupEnglishLabel,
  plantGuildGroupLabel,
  plantLatinTooltip,
  resolveUserPlant,
} from './resolvePlant';
import type { Plant, UserPlant } from './gardenTypes';

it('merges db species → species override → cultivar → cultivar override', () => {
  const user: UserPlant = {
    id: 'u1',
    speciesId: 'apple',
    cultivarId: 'granny_smith',
    speciesOverride: { iconId: 'leaf-herb' },
    cultivarOverride: { name: 'GS (mine)' },
  };
  const r = resolveUserPlant(user, plantCatalog);
  expect(r.iconId).toBe('leaf-herb');
  expect(r.cultivar).toBe('GS (mine)');
  expect(r.name).toBe('Apple');
  expect(r.nameLatin).toBe('Malus domestica');
});

it('guild group label is species only for default cultivar', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'basil',
    cultivarId: null,
    name: 'Basil',
    cultivar: null,
    nameLatin: 'Ocimum basilicum',
    iconId: 'leaf-herb',
    functions: [],
    layers: [],
  };
  expect(plantGuildGroupLabel(p)).toBe('Basil (Ocimum basilicum)');
});

it('guild group label is species and cultivar when a cultivar is selected', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'basil',
    cultivarId: 'genovese',
    name: 'Basil',
    cultivar: 'Genovese',
    nameLatin: 'Ocimum basilicum',
    iconId: 'leaf-herb',
    functions: [],
    layers: [],
  };
  expect(plantGuildGroupLabel(p)).toBe('Basil (Ocimum basilicum), Genovese');
});

it('shows cultivar Latin only when the cultivar has its own name_latin', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'daisy',
    cultivarId: 'oxeye',
    name: 'Daisy',
    cultivar: 'Oxeye daisy',
    cultivarLatin: 'Leucanthemum vulgare',
    iconId: 'flower',
    functions: [],
    layers: [],
  };
  expect(plantDisplayLabel(p)).toBe('Oxeye daisy (Leucanthemum vulgare)');
  expect(plantGuildGroupLabel(p)).toBe('Daisy, Oxeye daisy (Leucanthemum vulgare)');
});

it('does not repeat species Latin on cultivars without their own name_latin', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'apple',
    cultivarId: 'fuji',
    name: 'Apple',
    cultivar: 'Fuji',
    nameLatin: 'Malus domestica',
    iconId: 'apple',
    functions: [],
    layers: [],
  };
  expect(plantDisplayLabel(p)).toBe('Fuji');
  expect(plantGuildGroupLabel(p)).toBe('Apple (Malus domestica), Fuji');
});

it('uses English-only labels and separate Latin tooltip for guild list badges', () => {
  const p: Plant = {
    id: 'u1',
    speciesId: 'apple',
    cultivarId: 'fuji',
    name: 'Apple',
    cultivar: 'Fuji',
    nameLatin: 'Malus domestica',
    iconId: 'apple',
    functions: [],
    layers: [],
  };
  expect(plantGuildGroupEnglishLabel(p)).toBe('Apple, Fuji');
  expect(plantLatinTooltip(p)).toBe('Malus domestica');
  expect(plantGuildGroupEnglishLabel({ ...p, cultivarId: null, cultivar: null })).toBe(
    'Apple',
  );
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
