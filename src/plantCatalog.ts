import rawCatalog from './data/plantCatalog.json';
import type { GuildFunction, GuildLayer } from './gardenTypes';
import type { PlantIconId } from './plantIcons/iconIds';

/** Inclusive calendar months (1 = Jan … 12 = Dec). If `start` > `end`, the range wraps into the next year (e.g. Oct–Apr). */
export type CatalogMonthPeriod = { start: number; end: number };

export const CATALOG_MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Two-letter month keys (Jun/Jul → Jn/Jl) for compact calendars. */
export const CATALOG_MONTH_LABELS_2 = [
  'Ja',
  'Fe',
  'Mr',
  'Ap',
  'My',
  'Jn',
  'Jl',
  'Au',
  'Se',
  'Oc',
  'No',
  'De',
] as const;

const MONTH_LABELS = CATALOG_MONTH_LABELS;

export const formatMonthPeriod = (p: CatalogMonthPeriod): string => {
  const s = MONTH_LABELS[p.start - 1];
  const e = MONTH_LABELS[p.end - 1];
  if (!s || !e) {
    return '';
  }
  return s === e ? s : `${s}–${e}`;
};

export type CatalogPhenology = {
  blooming?: CatalogMonthPeriod;
  fruiting?: CatalogMonthPeriod;
};

/** Cultivar row: include optional fields only when they differ from the species defaults. */
export type CatalogCultivar = {
  id: string;
  name: string;
  defaultIconId?: PlantIconId;
  functions?: GuildFunction[];
  layers?: GuildLayer[];
  /** Omit to inherit species. `null` clears inherited species phenology for this aspect. */
  blooming?: CatalogMonthPeriod | null;
  /** Omit to inherit species. `null` clears inherited species phenology for this aspect. */
  fruiting?: CatalogMonthPeriod | null;
};

export type CatalogSpecies = {
  id: string;
  name: string;
  defaultIconId: PlantIconId;
  functions: GuildFunction[];
  layers: GuildLayer[];
  blooming?: CatalogMonthPeriod;
  fruiting?: CatalogMonthPeriod;
  cultivars: CatalogCultivar[];
};

export type PlantCatalogFile = {
  species: CatalogSpecies[];
};

export const plantCatalog = rawCatalog as PlantCatalogFile;

export const getSpecies = (id: string): CatalogSpecies | undefined =>
  plantCatalog.species.find((s) => s.id === id);

export const getCultivar = (
  species: CatalogSpecies,
  cultivarId: string,
): CatalogCultivar | undefined => species.cultivars.find((c) => c.id === cultivarId);

type PhenologyPeriodKey = 'blooming' | 'fruiting';

const resolvePeriodFromSpeciesAndCultivar = (
  species: CatalogSpecies,
  cultivar: CatalogCultivar | undefined,
  key: PhenologyPeriodKey,
): CatalogMonthPeriod | undefined => {
  if (cultivar !== undefined && Object.prototype.hasOwnProperty.call(cultivar, key)) {
    const v = cultivar[key];
    return v === null ? undefined : v;
  }
  return species[key];
};

export const mergeSpeciesCultivarPhenology = (
  species: CatalogSpecies,
  cultivar: CatalogCultivar | undefined,
): CatalogPhenology => ({
  blooming: resolvePeriodFromSpeciesAndCultivar(species, cultivar, 'blooming'),
  fruiting: resolvePeriodFromSpeciesAndCultivar(species, cultivar, 'fruiting'),
});

export const resolvePhenology = (
  speciesId: string,
  cultivarId: string | null,
): CatalogPhenology => {
  const species = getSpecies(speciesId);
  if (!species) {
    return {};
  }
  const cultivar = cultivarId ? getCultivar(species, cultivarId) : undefined;
  return mergeSpeciesCultivarPhenology(species, cultivar);
};

export const formatPhenologySummary = (ph: CatalogPhenology): string | null => {
  const parts: string[] = [];
  if (ph.blooming) {
    parts.push(`Bloom ${formatMonthPeriod(ph.blooming)}`);
  }
  if (ph.fruiting) {
    parts.push(`Fruit ${formatMonthPeriod(ph.fruiting)}`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
};

export const phenologySummaryForPlant = (
  speciesId: string,
  cultivarId: string | null,
): string | null => formatPhenologySummary(resolvePhenology(speciesId, cultivarId));

/** True if `month` (1–12) lies in the inclusive period; supports wrap when start > end. */
export const isMonthInCatalogPeriod = (
  month: number,
  period: CatalogMonthPeriod,
): boolean => {
  if (month < 1 || month > 12) {
    return false;
  }
  const { start, end } = period;
  if (start <= end) {
    return month >= start && month <= end;
  }
  return month >= start || month <= end;
};

const addPeriodToMonthCounts = (
  counts: number[],
  period: CatalogMonthPeriod | undefined,
): void => {
  if (!period) {
    return;
  }
  for (let m = 1; m <= 12; m++) {
    if (isMonthInCatalogPeriod(m, period)) {
      counts[m - 1]++;
    }
  }
};

/** Per calendar month, how many plant rows fall in fruiting / blooming windows (same counting as guild cards). */
export const fruitBloomMonthCountsForPhenologies = (
  phenologies: CatalogPhenology[],
): { fruiting: number[]; blooming: number[] } => {
  const fruiting = Array.from({ length: 12 }, () => 0);
  const blooming = Array.from({ length: 12 }, () => 0);
  for (const ph of phenologies) {
    addPeriodToMonthCounts(fruiting, ph.fruiting);
    addPeriodToMonthCounts(blooming, ph.blooming);
  }
  return { fruiting, blooming };
};

/** Guild calendar: fruiting months if the species fruits; otherwise blooming months. */
export const resolveGuildCalendarPeriod = (
  ph: CatalogPhenology,
): CatalogMonthPeriod | null => ph.fruiting ?? ph.blooming ?? null;
