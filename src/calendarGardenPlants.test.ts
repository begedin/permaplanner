import { expect, it } from 'vitest';

import {
  formatSpeciesCounts,
  guildSpeciesCounts,
  guildSpeciesTooltipRows,
  listCalendarCultivarsForSpecies,
  listGardenSpecies,
} from './calendarGardenPlants';
import type { Guild, Plant, UserPlant } from './gardenTypes';

const appleDefault = (): Plant => ({
  id: 'p-apple-default',
  speciesId: 'apple',
  cultivarId: null,
  name: 'Apple',
  cultivar: null,
  iconId: 'apple',
  functions: ['edible'],
  layers: ['overstory'],
});

const appleFuji = (): Plant => ({
  id: 'p-apple-fuji',
  speciesId: 'apple',
  cultivarId: 'fuji',
  name: 'Apple',
  cultivar: 'Fuji',
  iconId: 'apple',
  functions: ['edible'],
  layers: ['overstory'],
});

const appleHoneycrisp = (): Plant => ({
  id: 'p-apple-honeycrisp',
  speciesId: 'apple',
  cultivarId: 'honeycrisp',
  name: 'Apple',
  cultivar: 'Honeycrisp',
  iconId: 'apple',
  functions: ['edible'],
  layers: ['overstory'],
});

const basil = (): Plant => ({
  id: 'p-basil',
  speciesId: 'basil',
  cultivarId: null,
  name: 'Basil',
  cultivar: null,
  iconId: 'leaf-herb',
  functions: ['edible'],
  layers: ['herb'],
});

const userPlants: UserPlant[] = [
  { id: 'p-apple-default', speciesId: 'apple', cultivarId: null },
  { id: 'p-apple-fuji', speciesId: 'apple', cultivarId: 'fuji' },
  { id: 'p-apple-honeycrisp', speciesId: 'apple', cultivarId: 'honeycrisp' },
  { id: 'p-basil', speciesId: 'basil', cultivarId: null },
];

const resolvePlant = (id: string): Plant => {
  if (id === 'p-apple-default') {
    return appleDefault();
  }
  if (id === 'p-apple-fuji') {
    return appleFuji();
  }
  if (id === 'p-apple-honeycrisp') {
    return appleHoneycrisp();
  }
  return basil();
};

const guilds: Guild[] = [
  {
    id: 'g1',
    name: 'Bed A',
    path: [],
    mulchLevel: 1,
    plants: [
      {
        id: 't1',
        plantId: 'p-apple-fuji',
        nameOrCultivar: 'Fuji',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        growthPhase: 'young',
        vigor: 4,
      },
      {
        id: 't2',
        plantId: 'p-apple-fuji',
        nameOrCultivar: 'Fuji',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
        growthPhase: 'established',
        vigor: 5,
      },
      {
        id: 't3',
        plantId: 'p-apple-honeycrisp',
        nameOrCultivar: 'Honeycrisp',
        x: 0,
        y: 0,
        width: 16,
        height: 16,
      },
    ],
  },
];

it('counts unique cultivars and total plants from guild placements', () => {
  expect(guildSpeciesCounts(guilds, 'apple', resolvePlant)).toEqual({
    cultivarCount: 2,
    plantCount: 3,
  });
  expect(guildSpeciesCounts(guilds, 'basil', resolvePlant)).toEqual({
    cultivarCount: 0,
    plantCount: 0,
  });
});

it('lists only species placed in guilds with cultivar and plant counts', () => {
  const rows = listGardenSpecies(guilds, resolvePlant);
  expect(rows).toEqual([
    {
      speciesId: 'apple',
      name: 'Apple',
      iconId: 'apple',
      cultivarCount: 2,
      plantCount: 3,
      producesFruit: true,
      cultivarLabels: 'Fuji Honeycrisp',
    },
  ]);
  for (const row of rows) {
    expect(row.plantCount).toBeGreaterThanOrEqual(row.cultivarCount);
  }
});

it('omits species that exist only in the plant catalog', () => {
  expect(listGardenSpecies(guilds, resolvePlant)).toEqual([
    expect.objectContaining({ speciesId: 'apple', plantCount: 3 }),
  ]);
  expect(listGardenSpecies([], resolvePlant)).toEqual([]);
});

it('sorts species by cultivar count then fruiting plants', () => {
  const resolve = (id: string): Plant => {
    if (id === 'p-cherry') {
      return {
        id,
        speciesId: 'sweet_cherry',
        cultivarId: null,
        name: 'Sweet cherry',
        cultivar: null,
        iconId: 'cherry',
        functions: ['edible'],
        layers: ['shrub'],
      };
    }
    return resolvePlant(id);
  };

  expect(listGardenSpecies(guilds, resolve).map((row) => row.speciesId)).toEqual([
    'apple',
  ]);
});

it('formats species counts for display', () => {
  expect(formatSpeciesCounts(1, 1)).toBe('1 cultivar · 1 plant');
  expect(formatSpeciesCounts(2, 5)).toBe('2 cultivars · 5 plants');
});

it('lists only cultivars placed in guilds for a species', () => {
  expect(
    listCalendarCultivarsForSpecies(userPlants, 'apple', guilds, resolvePlant),
  ).toEqual([
    {
      userPlantId: 'p-apple-fuji',
      label: 'Fuji',
      resolved: appleFuji(),
      phenology: expect.objectContaining({
        blooming: { start: 4, end: 5 },
        fruiting: { start: 8, end: 10 },
      }),
      guildInstanceCount: 2,
      headerPhaseSlots: [
        { thingId: 't1', phase: 'young' },
        { thingId: 't2', phase: 'established' },
      ],
      showPhaseOverflow: false,
      averageVigor: 5,
      tooltipRows: [expect.objectContaining({ label: 'Apple, Fuji', count: 2 })],
    },
    {
      userPlantId: 'p-apple-honeycrisp',
      label: 'Honeycrisp',
      resolved: appleHoneycrisp(),
      phenology: expect.objectContaining({
        blooming: { start: 4, end: 5 },
        fruiting: { start: 8, end: 10 },
      }),
      guildInstanceCount: 1,
      headerPhaseSlots: [],
      showPhaseOverflow: false,
      averageVigor: null,
      tooltipRows: [expect.objectContaining({ label: 'Apple, Honeycrisp', count: 1 })],
    },
  ]);
});

it('builds guild tooltip rows for a species from bed placements', () => {
  expect(guildSpeciesTooltipRows(guilds, 'apple', resolvePlant)).toEqual([
    expect.objectContaining({ label: 'Apple, Fuji', count: 2 }),
    expect.objectContaining({ label: 'Apple, Honeycrisp', count: 1 }),
  ]);
});

it('keeps plant count at least cultivar count when guilds repeat a cultivar', () => {
  expect(guildSpeciesCounts(guilds, 'apple', resolvePlant)).toMatchObject({
    cultivarCount: 2,
    plantCount: 3,
  });
});
