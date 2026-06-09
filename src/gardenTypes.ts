import type { GrowthPhase, PlantVigor } from './guildPlantInstanceStatus';
import type { PlantIconId } from './plantIcons/iconIds';

export type { GrowthPhase, PlantVigor } from './guildPlantInstanceStatus';

export const GuildFunction = {
  nitrogen_fixer: 'nitrogen_fixer',
  dynamic_accumulator: 'dynamic_accumulator',
  pollinator_attractor: 'pollinator_attractor',
  pest_repellent: 'pest_repellent',
  ground_cover: 'ground_cover',
  wildfire_suppressor: 'wildfire_suppressor',
  mulcher: 'mulcher',
  edible: 'edible',
  medicinal: 'medicinal',
} as const;

export type GuildFunction = (typeof GuildFunction)[keyof typeof GuildFunction];

export const GuildLayer = {
  overstory: 'overstory',
  understory: 'understory',
  shrub: 'shrub',
  ground_cover: 'ground_cover',
  vine: 'vine',
  herb: 'herb',
  root: 'root',
} as const;

export type GuildLayer = (typeof GuildLayer)[keyof typeof GuildLayer];

/** Partial fields a user may override (species slot or cultivar slot). */
export type PlantOverrideFields = {
  name?: string;
  iconId?: PlantIconId;
  functions?: GuildFunction[];
  layers?: GuildLayer[];
};

/**
 * A plant in the saved plan: references catalog species/cultivar plus optional overrides.
 * Merge order when resolving: db species → speciesOverride → db cultivar → cultivarOverride.
 */
export type UserPlant = {
  id: string;
  speciesId: string;
  cultivarId: string | null;
  speciesOverride?: PlantOverrideFields;
  cultivarOverride?: PlantOverrideFields;
};

/** Resolved plant for UI (catalog + user overrides merged). */
export type Plant = {
  id: string;
  speciesId: string;
  cultivarId: string | null;
  name: string;
  cultivar: string | null;
  /** Catalog Latin name(s) for search; not shown as primary labels. */
  nameLatin?: string;
  cultivarLatin?: string;
  iconId: PlantIconId;
  functions: GuildFunction[];
  layers: GuildLayer[];
};

export type GardenThing = {
  id: string;
  nameOrCultivar: string;
  plantId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Development phase (Option C: sown → germinated|transplanted → …). */
  growthPhase?: GrowthPhase;
  /** Health / vigor (1 = struggling … 5 = thriving). */
  vigor?: PlantVigor;
};

/** Guild bed mulch coverage / depth (1 = light, 5 = heavy). */
export type MulchLevel = 1 | 2 | 3 | 4 | 5;

export const coerceMulchLevel = (v: unknown): MulchLevel => {
  if (typeof v === 'number' && Number.isFinite(v)) {
    const r = Math.round(v);
    if (r >= 1 && r <= 5) {
      return r as MulchLevel;
    }
  }
  return 1;
};

export type Guild = {
  id: string;
  name: string;
  path: { x: number; y: number }[];
  plants: GardenThing[];
  mulchLevel: MulchLevel;
  note?: string;
};
