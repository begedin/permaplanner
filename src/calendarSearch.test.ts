import { expect, it } from 'vitest';

import { listGardenSpecies } from './calendarGardenPlants';
import { searchGardenSpecies } from './calendarSearch';
import type { Plant } from './gardenTypes';

const rows = listGardenSpecies(
  [
    {
      id: 'g1',
      name: 'Bed',
      path: [],
      mulchLevel: 1,
      plants: [
        {
          id: 't1',
          plantId: 'p1',
          nameOrCultivar: 'Fuji',
          x: 0,
          y: 0,
          width: 16,
          height: 16,
        },
      ],
    },
  ],
  (id): Plant =>
    id === 'p1'
      ? {
          id: 'p1',
          speciesId: 'apple',
          cultivarId: 'fuji',
          name: 'Apple',
          cultivar: 'Fuji',
          iconId: 'apple',
          functions: [],
          layers: [],
        }
      : {
          id: 'p2',
          speciesId: 'basil',
          cultivarId: null,
          name: 'Basil',
          cultivar: null,
          iconId: 'leaf-herb',
          functions: [],
          layers: [],
        },
);

it('returns all species rows when the query is empty', () => {
  expect(searchGardenSpecies(rows, '   ')).toEqual(rows);
});

it('matches species names and cultivar labels from guild placements', () => {
  expect(searchGardenSpecies(rows, 'fuji').map((row) => row.speciesId)).toEqual([
    'apple',
  ]);
  expect(searchGardenSpecies(rows, 'basil').map((row) => row.speciesId)).toEqual([]);
});

it('returns no rows when nothing matches', () => {
  expect(searchGardenSpecies(rows, 'zzzz')).toEqual([]);
});
