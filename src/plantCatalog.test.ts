import { expect, it } from 'vitest';

import {
  type CatalogCultivar,
  type CatalogSpecies,
  CATALOG_MONTH_LABELS_2,
  formatMonthPeriod,
  formatPhenologySummary,
  harvestBloomMonthCountsForPhenologies,
  isMonthInCatalogPeriod,
  mergeSpeciesCultivarPhenology,
  phenologySummaryForPlant,
  resolveGuildCalendarPeriod,
  resolvePhenology,
} from './plantCatalog';

it('exposes twelve two-letter month labels', () => {
  expect(CATALOG_MONTH_LABELS_2).toHaveLength(12);
  expect(CATALOG_MONTH_LABELS_2.every((s) => s.length === 2)).toBe(true);
});

it('formats same-month and multi-month periods', () => {
  expect(formatMonthPeriod({ start: 4, end: 4 })).toBe('Apr');
  expect(formatMonthPeriod({ start: 4, end: 6 })).toBe('Apr–Jun');
});

it('formats wrapped periods (harvest across year boundary)', () => {
  expect(formatMonthPeriod({ start: 10, end: 4 })).toBe('Oct–Apr');
});

it('resolves phenology from catalog species', () => {
  expect(resolvePhenology('apple', null)).toMatchObject({
    blooming: { start: 4, end: 5 },
    harvest: { start: 8, end: 10 },
  });
});

it('inherits species phenology when cultivar omits blooming and harvest', () => {
  expect(resolvePhenology('rosehip', 'dog_rose')).toMatchObject({
    blooming: { start: 5, end: 7 },
    harvest: { start: 9, end: 11 },
  });
});

it('treats cultivar harvest null as clearing inherited species harvest', () => {
  expect(resolvePhenology('rosehip', 'ornamental')).toMatchObject({
    blooming: { start: 5, end: 10 },
  });
  expect(resolvePhenology('rosehip', 'ornamental').harvest).toBeUndefined();
  expect(phenologySummaryForPlant('rosehip', 'ornamental')).toBe('Bloom May–Oct');
  expect(resolveGuildCalendarPeriod(resolvePhenology('rosehip', 'ornamental'))).toEqual({
    start: 5,
    end: 10,
  });
});

it('treats cultivar blooming null as clearing inherited species blooming', () => {
  const species: CatalogSpecies = {
    id: 'x',
    name: 'X',
    defaultIconId: 'seedling',
    functions: [],
    layers: [],
    cultivars: [],
    blooming: { start: 1, end: 2 },
    harvest: { start: 6, end: 7 },
  };
  const cultivar: CatalogCultivar = {
    id: 'c',
    name: 'C',
    blooming: null,
  };
  expect(mergeSpeciesCultivarPhenology(species, cultivar)).toEqual({
    blooming: undefined,
    harvest: { start: 6, end: 7 },
  });
});

it('returns empty phenology for unknown species id', () => {
  expect(resolvePhenology('not_a_real_id', null)).toEqual({});
});

it('summarizes phenology for guild display', () => {
  expect(
    formatPhenologySummary({
      blooming: { start: 5, end: 6 },
      harvest: { start: 7, end: 8 },
    }),
  ).toBe('Bloom May–Jun · Harvest Jul–Aug');
  expect(phenologySummaryForPlant('basil', null)).toBe('Bloom Jul–Sep');
});

it('returns null summary when catalog entry has no phenology', () => {
  expect(phenologySummaryForPlant('banana', null)).toBeNull();
});

it('detects months inside inclusive and wrapped periods', () => {
  expect(isMonthInCatalogPeriod(5, { start: 4, end: 6 })).toBe(true);
  expect(isMonthInCatalogPeriod(3, { start: 4, end: 6 })).toBe(false);
  expect(isMonthInCatalogPeriod(1, { start: 10, end: 4 })).toBe(true);
  expect(isMonthInCatalogPeriod(7, { start: 10, end: 4 })).toBe(false);
});

it('resolves guild calendar to harvest when present else bloom', () => {
  expect(
    resolveGuildCalendarPeriod({
      blooming: { start: 4, end: 5 },
      harvest: { start: 8, end: 10 },
    }),
  ).toEqual({ start: 8, end: 10 });
  expect(resolveGuildCalendarPeriod({ blooming: { start: 5, end: 6 } })).toEqual({
    start: 5,
    end: 6,
  });
  expect(resolveGuildCalendarPeriod({})).toBeNull();
});

it('aggregates harvest and bloom month counts across phenology rows', () => {
  const apple = resolvePhenology('apple', null);
  const { harvest, blooming } = harvestBloomMonthCountsForPhenologies([apple, apple]);
  expect(harvest[7]).toBe(2);
  expect(harvest[6]).toBe(0);
  expect(blooming[3]).toBe(2);
});

it('uses the bloom calendar for sterile snowball viburnum', () => {
  const phenology = resolvePhenology('viburnum', 'snowball');
  expect(phenology).toEqual({
    blooming: { start: 4, end: 5 },
    harvest: undefined,
  });
  expect(resolveGuildCalendarPeriod(phenology)).toEqual({ start: 4, end: 5 });
});

it('includes autumn harvests for primocane raspberries without extending summer cultivars', () => {
  expect(
    ['heritage', 'fall_gold', 'tulameen'].map((cultivarId) => {
      const phenology = resolvePhenology('raspberry', cultivarId);
      return { cultivarId, period: resolveGuildCalendarPeriod(phenology) };
    }),
  ).toEqual([
    { cultivarId: 'heritage', period: { start: 8, end: 10 } },
    { cultivarId: 'fall_gold', period: { start: 8, end: 10 } },
    { cultivarId: 'tulameen', period: { start: 7, end: 8 } },
  ]);
});
