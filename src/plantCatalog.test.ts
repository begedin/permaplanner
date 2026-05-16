import { expect, it } from 'vitest';

import {
  type CatalogCultivar,
  type CatalogSpecies,
  CATALOG_MONTH_LABELS_2,
  formatMonthPeriod,
  formatPhenologySummary,
  fruitBloomMonthCountsForPhenologies,
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
    fruiting: { start: 8, end: 10 },
  });
});

it('inherits species phenology when cultivar omits blooming and fruiting', () => {
  expect(resolvePhenology('rosehip', 'dog_rose')).toMatchObject({
    blooming: { start: 5, end: 7 },
    fruiting: { start: 9, end: 11 },
  });
});

it('treats cultivar fruiting null as clearing inherited species fruiting', () => {
  expect(resolvePhenology('rosehip', 'ornamental')).toMatchObject({
    blooming: { start: 5, end: 10 },
  });
  expect(resolvePhenology('rosehip', 'ornamental').fruiting).toBeUndefined();
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
    defaultEmoji: '🌱',
    functions: [],
    layers: [],
    cultivars: [],
    blooming: { start: 1, end: 2 },
    fruiting: { start: 6, end: 7 },
  };
  const cultivar: CatalogCultivar = {
    id: 'c',
    name: 'C',
    blooming: null,
  };
  expect(mergeSpeciesCultivarPhenology(species, cultivar)).toEqual({
    blooming: undefined,
    fruiting: { start: 6, end: 7 },
  });
});

it('returns empty phenology for unknown species id', () => {
  expect(resolvePhenology('not_a_real_id', null)).toEqual({});
});

it('summarizes phenology for guild display', () => {
  expect(formatPhenologySummary({ blooming: { start: 5, end: 6 }, fruiting: { start: 7, end: 8 } })).toBe(
    'Bloom May–Jun · Fruit Jul–Aug',
  );
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

it('resolves guild calendar to fruiting when present else bloom', () => {
  expect(
    resolveGuildCalendarPeriod({ blooming: { start: 4, end: 5 }, fruiting: { start: 8, end: 10 } }),
  ).toEqual({ start: 8, end: 10 });
  expect(resolveGuildCalendarPeriod({ blooming: { start: 5, end: 6 } })).toEqual({ start: 5, end: 6 });
  expect(resolveGuildCalendarPeriod({})).toBeNull();
});

it('aggregates fruit and bloom month counts across phenology rows', () => {
  const apple = resolvePhenology('apple', null);
  const { fruiting, blooming } = fruitBloomMonthCountsForPhenologies([apple, apple]);
  expect(fruiting[7]).toBe(2);
  expect(fruiting[6]).toBe(0);
  expect(blooming[3]).toBe(2);
});
