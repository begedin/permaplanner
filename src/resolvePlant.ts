import type { PlantCatalogFile } from './plantCatalog';
import { getCultivar, getSpecies, plantCatalog } from './plantCatalog';
import type {
  GuildFunction,
  GuildLayer,
  Plant,
  PlantOverrideFields,
  UserPlant,
} from './gardenTypes';

const applyScalarOverride = <T extends string>(base: T, o?: T): T =>
  o !== undefined ? o : base;

const applyArrayOverride = (
  base: GuildFunction[],
  o?: GuildFunction[],
): GuildFunction[] => (o !== undefined ? [...o] : [...base]);

const applyLayerOverride = (base: GuildLayer[], o?: GuildLayer[]): GuildLayer[] =>
  o !== undefined ? [...o] : [...base];

const applyPlantOverrideFields = (
  speciesName: string,
  emoji: string,
  functions: GuildFunction[],
  layers: GuildLayer[],
  o?: PlantOverrideFields,
): {
  speciesName: string;
  emoji: string;
  functions: GuildFunction[];
  layers: GuildLayer[];
} => ({
  speciesName: applyScalarOverride(speciesName, o?.name),
  emoji: applyScalarOverride(emoji, o?.emoji),
  functions: applyArrayOverride(functions, o?.functions),
  layers: applyLayerOverride(layers, o?.layers),
});

/**
 * Resolved display: db species → speciesOverride → db cultivar → cultivarOverride.
 */
export const resolveUserPlant = (
  user: UserPlant,
  catalog: PlantCatalogFile = plantCatalog,
): Plant => {
  const species = getSpecies(user.speciesId) ?? catalog.species[0];

  let speciesName = species.name;
  let emoji = species.defaultEmoji;
  let functions = [...species.functions];
  let layers = [...species.layers];

  ({ speciesName, emoji, functions, layers } = applyPlantOverrideFields(
    speciesName,
    emoji,
    functions,
    layers,
    user.speciesOverride,
  ));

  let cultivarName: string | null = null;

  if (user.cultivarId !== null) {
    const row = getCultivar(species, user.cultivarId);
    if (row) {
      cultivarName = row.name;
      if (row.defaultEmoji !== undefined) {
        emoji = row.defaultEmoji;
      }
      if (row.functions !== undefined) {
        functions = [...row.functions];
      }
      if (row.layers !== undefined) {
        layers = [...row.layers];
      }
    }
  }

  const co = user.cultivarOverride;
  if (co) {
    if (co.name !== undefined) {
      cultivarName = co.name;
    }
    if (co.emoji !== undefined) {
      emoji = co.emoji;
    }
    if (co.functions !== undefined) {
      functions = [...co.functions];
    }
    if (co.layers !== undefined) {
      layers = [...co.layers];
    }
  }

  return {
    id: user.id,
    speciesId: user.speciesId,
    cultivarId: user.cultivarId,
    name: speciesName,
    cultivar: cultivarName,
    emoji,
    functions,
    layers,
  };
};

const LEGACY_ID_MAP: Record<string, { speciesId: string; cultivarId: string | null }> = {
  apple_granny_smith: { speciesId: 'apple', cultivarId: 'granny_smith' },
  apple_fuji: { speciesId: 'apple', cultivarId: 'fuji' },
  banana_cavendish: { speciesId: 'banana', cultivarId: 'cavendish' },
  haskap: { speciesId: 'haskap', cultivarId: null },
  comfrey: { speciesId: 'comfrey', cultivarId: null },
};

const FEATURE_EMOJI: Record<string, string> = {
  apple: '🍎',
  banana: '🍌',
  blueberry: '🫐',
  cherry: '🍒',
  lemon: '🍋',
  orange: '🍊',
  pear: '🍐',
  strawberry: '🍓',
};

const isGuildFunction = (v: unknown): v is GuildFunction =>
  typeof v === 'string' &&
  [
    'nitrogen_fixer',
    'dynamic_accumulator',
    'pollinator_attractor',
    'pest_repellent',
    'ground_cover',
    'wildfire_suppressor',
    'mulcher',
    'edible',
    'medicinal',
  ].includes(v);

const isGuildLayer = (v: unknown): v is GuildLayer =>
  typeof v === 'string' &&
  ['overstory', 'understory', 'shrub', 'ground_cover', 'vine', 'herb', 'root'].includes(
    v,
  );

const isUserPlant = (row: Record<string, unknown>): row is UserPlant =>
  typeof row.id === 'string' &&
  typeof row.speciesId === 'string' &&
  (row.cultivarId === null || typeof row.cultivarId === 'string');

const legacyToUserPlant = (
  row: Record<string, unknown>,
  catalog: PlantCatalogFile,
): UserPlant => {
  const id = row.id as string;
  const mapped = LEGACY_ID_MAP[id];
  if (mapped) {
    return {
      id,
      speciesId: mapped.speciesId,
      cultivarId: mapped.cultivarId,
    };
  }

  const name = typeof row.name === 'string' ? row.name : 'Plant';
  const cultivarStr =
    row.cultivar === null || row.cultivar === undefined ? null : String(row.cultivar);
  const speciesHit = catalog.species.find(
    (s) => s.name.toLowerCase() === name.toLowerCase(),
  );
  const feature = row.feature as string | null | undefined;
  const emoji = feature && FEATURE_EMOJI[feature] ? FEATURE_EMOJI[feature] : '🌱';

  if (speciesHit) {
    const cultivarHit = cultivarStr
      ? speciesHit.cultivars.find(
          (c) => c.name.toLowerCase() === cultivarStr.toLowerCase(),
        )
      : undefined;
    return {
      id,
      speciesId: speciesHit.id,
      cultivarId: cultivarHit?.id ?? null,
    };
  }

  return {
    id,
    speciesId: 'unknown',
    cultivarId: null,
    speciesOverride: {
      name,
      emoji,
      functions: Array.isArray(row.functions)
        ? row.functions.filter(isGuildFunction)
        : [],
      layers: Array.isArray(row.layers) ? row.layers.filter(isGuildLayer) : [],
    },
  };
};

export const normalizePlantsFromFile = (
  raw: unknown,
  catalog: PlantCatalogFile,
): UserPlant[] => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [];
  }
  const first = raw[0];
  if (
    first &&
    typeof first === 'object' &&
    !Array.isArray(first) &&
    isUserPlant(first as Record<string, unknown>)
  ) {
    return raw as UserPlant[];
  }
  return (raw as Record<string, unknown>[]).map((row) => legacyToUserPlant(row, catalog));
};

export const plantDisplayLabel = (p: Plant): string => p.cultivar || p.name;

/** Guild card list: species only for the default cultivar; `Species, Cultivar` when a specific cultivar is selected. */
export const plantGuildGroupLabel = (p: Plant): string => {
  if (p.cultivarId === null) {
    return p.name;
  }
  const c = p.cultivar?.trim();
  return c ? `${p.name}, ${c}` : p.name;
};
