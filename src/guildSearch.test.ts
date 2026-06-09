import { expect, it } from 'vitest';

import type { GardenThing, Guild, Plant } from './gardenTypes';
import {
  buildGuildSearchRecord,
  highlightSegments,
  searchGuilds,
  spanHighlightRanges,
} from './guildSearch';
import { searchInputPlaceholder } from './searchContext';

const testPlant = (overrides: Partial<Plant> & Pick<Plant, 'id' | 'name'>): Plant => ({
  speciesId: 'species',
  cultivarId: null,
  cultivar: null,
  iconId: 'seedling',
  functions: [],
  layers: [],
  ...overrides,
});

const thing = (
  overrides: Partial<GardenThing> & Pick<GardenThing, 'id' | 'plantId'>,
): GardenThing => ({
  nameOrCultivar: 'Instance label',
  x: 0,
  y: 0,
  width: 16,
  height: 16,
  ...overrides,
});

const guild = (overrides: Partial<Guild> & Pick<Guild, 'id' | 'name'>): Guild => ({
  path: [],
  plants: [],
  mulchLevel: 1,
  ...overrides,
});

const resolvePlant =
  (plants: Record<string, Plant>) =>
  (plantId: string): Plant =>
    plants[plantId] ?? testPlant({ id: plantId, name: 'Unknown', speciesId: 'unknown' });

it('buildGuildSearchRecord collects guild, instance, and catalog plant labels', () => {
  const record = buildGuildSearchRecord(
    guild({
      id: 'g1',
      name: 'Berry guild',
      note: 'North slope',
      plants: [
        thing({
          id: 't1',
          plantId: 'p1',
          nameOrCultivar: 'Sunrise strawberry',
        }),
      ],
    }),
    resolvePlant({
      p1: testPlant({
        id: 'p1',
        name: 'Strawberry',
        cultivarId: 'sunrise',
        cultivar: 'Sunrise',
      }),
    }),
  );

  expect(record).toEqual({
    guildId: 'g1',
    name: 'Berry guild',
    plantLabels: 'Sunrise strawberry Sunrise Strawberry',
    note: 'North slope',
  });
});

it('returns all guilds when the query is empty', () => {
  const guilds = [guild({ id: 'a', name: 'Alpha' }), guild({ id: 'b', name: 'Beta' })];

  expect(searchGuilds(guilds, '   ', resolvePlant({}))).toEqual(guilds);
});

it('ranks guild name matches above plant label matches', () => {
  const guilds = [
    guild({ id: 'name-hit', name: 'Cherry guild' }),
    guild({
      id: 'plant-hit',
      name: 'Back corner',
      plants: [
        thing({
          id: 't1',
          plantId: 'p1',
          nameOrCultivar: 'Cherry tomato',
        }),
      ],
    }),
  ];

  expect(
    searchGuilds(
      guilds,
      'cherry',
      resolvePlant({ p1: testPlant({ id: 'p1', name: 'Tomato' }) }),
    ).map((g) => g.id),
  ).toEqual(['name-hit', 'plant-hit']);
});

it('matches guild notes', () => {
  const guilds = [
    guild({ id: 'a', name: 'Alpha', note: 'Needs more mulch near the fence' }),
    guild({ id: 'b', name: 'Beta' }),
  ];

  expect(searchGuilds(guilds, 'fence', resolvePlant({})).map((g) => g.id)).toEqual(['a']);
});

it('returns no guilds when nothing matches', () => {
  const guilds = [guild({ id: 'a', name: 'Alpha' })];

  expect(searchGuilds(guilds, 'zzzz', resolvePlant({}))).toEqual([]);
});

it('matches catalog Latin names in guild plant labels', () => {
  const guilds = [
    guild({
      id: 'g1',
      name: 'North bed',
      plants: [thing({ id: 't1', plantId: 'p1', nameOrCultivar: 'Fuji' })],
    }),
  ];

  expect(
    searchGuilds(
      guilds,
      'malus domestica',
      resolvePlant({
        p1: testPlant({
          id: 'p1',
          name: 'Apple',
          nameLatin: 'Malus domestica',
          cultivar: 'Fuji',
        }),
      }),
    ).map((g) => g.id),
  ).toEqual(['g1']);
});

it('returns plain text when the highlight query is empty', () => {
  expect(highlightSegments('Cherry guild', '')).toEqual([
    { text: 'Cherry guild', match: false },
  ]);
});

it('highlights a case-insensitive substring match', () => {
  expect(highlightSegments('Cherry guild', 'cherry')).toEqual([
    { text: 'Cherry', match: true },
    { text: ' guild', match: false },
  ]);
});

it('highlights fuzzy prefix matches as one span', () => {
  expect(highlightSegments('Strawberry', 'straw')).toEqual([
    { text: 'Strawberr', match: true },
    { text: 'y', match: false },
  ]);
});

it('spans disjoint fuzzy indices into one highlight', () => {
  expect(
    spanHighlightRanges([
      [0, 2],
      [5, 6],
    ]),
  ).toEqual([[0, 6]]);
});

it('uses platform-specific shortcuts in the search placeholder', () => {
  expect(searchInputPlaceholder(true)).toBe('"⌘+F" or "/" to search');
  expect(searchInputPlaceholder(false)).toBe('"Ctrl+F" or "/" to search');
});
