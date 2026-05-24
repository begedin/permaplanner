import { expect, it } from 'vitest';

import catalog from '../data/plantCatalog.json';
import { PLANT_ICON_IDS } from '../plantIcons/iconIds';
import { PLANT_ICON_OPTIONS } from '../plantIconOptions';
import { coercePlantIconId, migratePlantsOnDocument } from './plantIconFields';

it('catalog species use known icon ids', () => {
  for (const species of catalog.species) {
    expect(PLANT_ICON_IDS).toContain(species.defaultIconId);
  }
});

it('plant picker options are valid icon ids', () => {
  for (const iconId of PLANT_ICON_OPTIONS) {
    expect(PLANT_ICON_IDS).toContain(iconId);
  }
});

it('coerces legacy emoji strings to icon ids', () => {
  expect(coercePlantIconId('🟢')).toBe('seedling');
  expect(coercePlantIconId('🍎')).toBe('apple');
  expect(coercePlantIconId('🪻')).toBe('flower-spike');
  expect(coercePlantIconId('apple')).toBe('apple');
});

it('migratePlantsOnDocument converts emoji overrides to iconId', () => {
  expect(
    migratePlantsOnDocument({
      version: 3,
      plants: [
        {
          id: 'p1',
          speciesId: 'comfrey',
          cultivarId: null,
          speciesOverride: { emoji: '🪻' },
        },
      ],
    }),
  ).toEqual({
    version: 4,
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
