import {
  coerceGrowthPhase,
  coercePlantVigor,
  type GrowthPhase,
  type PlantVigor,
} from './guildPlantInstanceStatus';
import {
  coerceMulchLevel,
  type GardenThing,
  type Guild,
  type MulchLevel,
} from './gardenTypes';

/** Guild composition in saved files (no map geometry). */
export type PersistedGuildContent = {
  id: string;
  name: string;
  mulchLevel: MulchLevel;
  plants: {
    id: string;
    name: string;
    plantId: string;
    growthPhase?: GrowthPhase;
    vigor?: PlantVigor;
  }[];
};

/** Guild map layout in saved files (no plant catalog fields). */
export type PersistedGuildLocation = {
  id: string;
  path: { x: number; y: number }[];
  plants: Pick<GardenThing, 'id' | 'x' | 'y' | 'width' | 'height'>[];
};

export const splitGuildsForPersistence = (
  guilds: Guild[],
): { guilds: PersistedGuildContent[]; guildLocations: PersistedGuildLocation[] } => ({
  guilds: guilds.map((g) => ({
    id: g.id,
    name: g.name,
    mulchLevel: g.mulchLevel,
    plants: g.plants.map((p) => ({
      id: p.id,
      name: p.nameOrCultivar,
      plantId: p.plantId,
      ...(p.growthPhase !== undefined ? { growthPhase: p.growthPhase } : {}),
      ...(p.vigor !== undefined ? { vigor: p.vigor } : {}),
    })),
  })),
  guildLocations: guilds.map((g) => ({
    id: g.id,
    path: g.path,
    plants: g.plants.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      width: p.width,
      height: p.height,
    })),
  })),
});

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const parseContentPlants = (raw: unknown): PersistedGuildContent['plants'] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PersistedGuildContent['plants'] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string') {
      continue;
    }
    const name =
      typeof item.name === 'string'
        ? item.name
        : typeof item.nameOrCultivar === 'string'
          ? item.nameOrCultivar
          : '';
    const plantId = typeof item.plantId === 'string' ? item.plantId : '';
    const growthPhase = coerceGrowthPhase(item.growthPhase);
    const vigor = coercePlantVigor(item.vigor);
    out.push({
      id: item.id,
      name,
      plantId,
      ...(growthPhase !== undefined ? { growthPhase } : {}),
      ...(vigor !== undefined ? { vigor } : {}),
    });
  }
  return out;
};

const parseLocationPlants = (raw: unknown): PersistedGuildLocation['plants'] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PersistedGuildLocation['plants'] = [];
  for (const item of raw) {
    if (!isRecord(item) || typeof item.id !== 'string') {
      continue;
    }
    const num = (k: string) =>
      typeof item[k] === 'number' && Number.isFinite(item[k]) ? item[k] : 0;
    out.push({
      id: item.id,
      x: num('x'),
      y: num('y'),
      width: num('width'),
      height: num('height'),
    });
  }
  return out;
};

const parseGuildContentList = (raw: unknown): PersistedGuildContent[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PersistedGuildContent[] = [];
  for (const g of raw) {
    if (!isRecord(g) || typeof g.id !== 'string') {
      continue;
    }
    out.push({
      id: g.id,
      name: typeof g.name === 'string' ? g.name : '',
      mulchLevel: coerceMulchLevel(g.mulchLevel),
      plants: parseContentPlants(g.plants),
    });
  }
  return out;
};

const parseGuildLocationList = (raw: unknown): PersistedGuildLocation[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: PersistedGuildLocation[] = [];
  for (const g of raw) {
    if (!isRecord(g) || typeof g.id !== 'string') {
      continue;
    }
    const path = Array.isArray(g.path)
      ? g.path.filter(isRecord).map((pt) => ({
          x: typeof pt.x === 'number' ? pt.x : 0,
          y: typeof pt.y === 'number' ? pt.y : 0,
        }))
      : [];
    out.push({
      id: g.id,
      path,
      plants: parseLocationPlants(g.plants),
    });
  }
  return out;
};

/** Merge v3 split guild shards (or monolithic fields) into in-memory `Guild[]`. */
export const mergeGuildsFromPersistence = (
  guildsRaw: unknown,
  guildLocationsRaw: unknown,
): Guild[] => {
  const contents = parseGuildContentList(guildsRaw);
  if (contents.length === 0 && Array.isArray(guildsRaw) && guildsRaw.length > 0) {
    return (guildsRaw as Guild[]).map((g) => ({
      ...g,
      mulchLevel: coerceMulchLevel((g as Record<string, unknown>).mulchLevel),
    }));
  }

  const locations = parseGuildLocationList(guildLocationsRaw);
  const locById = new Map(locations.map((l) => [l.id, l]));

  return contents.map((c) => {
    const loc = locById.get(c.id);
    const geoById = new Map((loc?.plants ?? []).map((p) => [p.id, p]));
    const plants: GardenThing[] = c.plants.map((p) => {
      const geo = geoById.get(p.id);
      return {
        id: p.id,
        nameOrCultivar: p.name,
        plantId: p.plantId,
        x: geo?.x ?? 0,
        y: geo?.y ?? 0,
        width: geo?.width ?? 0,
        height: geo?.height ?? 0,
        ...(p.growthPhase !== undefined ? { growthPhase: p.growthPhase } : {}),
        ...(p.vigor !== undefined ? { vigor: p.vigor } : {}),
      };
    });
    return {
      id: c.id,
      name: c.name,
      path: loc?.path ?? [],
      mulchLevel: c.mulchLevel,
      plants,
    };
  });
};

const isLegacyMergedGuildList = (guilds: unknown[]): boolean => {
  const first = guilds[0];
  return isRecord(first) && 'path' in first;
};

/** Split legacy merged `guilds` arrays (v2) into v3 persisted fields on a document. */
export const splitGuildFieldsOnDocument = (
  doc: Record<string, unknown>,
): Record<string, unknown> => {
  const legacy = doc.guilds;
  if (!Array.isArray(legacy) || legacy.length === 0) {
    return { ...doc, version: 3, guildLocations: doc.guildLocations ?? [] };
  }
  if (!isLegacyMergedGuildList(legacy)) {
    return { ...doc, version: 3, guildLocations: doc.guildLocations ?? [] };
  }
  const { guilds, guildLocations } = splitGuildsForPersistence(legacy as Guild[]);
  return { ...doc, version: 3, guilds, guildLocations };
};
