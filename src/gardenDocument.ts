import { type Guild, type UserPlant } from './gardenTypes';
import { assert } from './utils';
import { plantCatalog } from './plantCatalog';
import { normalizePlantsFromFile } from './resolvePlant';
import { mergeGuildsFromPersistence } from './guildPersistence';
import { migratePlanDocumentRaw } from './permaplannerFileMigrate';
import {
  PERMAPLANNER_FILE_VERSION,
  type PermaplannerFileVersion,
} from './permaplannerFileVersion';
import { normalizeOnboardingState, type OnboardingState } from './onboardingTypes';

export type GardenDocument = {
  version: PermaplannerFileVersion;
  /** Monotonic plan version for comparing remote saves. */
  syncRevision: number;
  plants: UserPlant[];
  guilds: Guild[];
  mapScale: {
    start: { x: number; y: number };
    end: { x: number; y: number };
    linePhysicalLength: number;
  };
  backgroundOpacity: number;
  backgroundImage?: string;
  backgroundImagePath?: string;
  onboardingState: OnboardingState;
};

const defaultMapScaleSnapshot = (): GardenDocument['mapScale'] => ({
  start: { x: 20, y: 20 },
  end: { x: 150, y: 20 },
  linePhysicalLength: 1,
});

export const parseGardenDocument = async (raw: unknown): Promise<GardenDocument> => {
  const data = (await migratePlanDocumentRaw(assert(raw))) as Record<string, unknown> & {
    plants?: unknown;
    guilds?: Guild[];
  };

  const backgroundImageFromFile =
    typeof data.backgroundImage === 'string' ? data.backgroundImage : undefined;

  const syncRevision =
    typeof data.syncRevision === 'number' && Number.isFinite(data.syncRevision)
      ? Math.max(0, Math.floor(data.syncRevision))
      : 0;

  const plants = normalizePlantsFromFile(data.plants ?? [], plantCatalog);

  const base: GardenDocument = {
    version: PERMAPLANNER_FILE_VERSION,
    syncRevision,
    plants,
    guilds: mergeGuildsFromPersistence(data.guilds, data.guildLocations),
    mapScale: defaultMapScaleSnapshot(),
    backgroundOpacity: 0.4,
    onboardingState: normalizeOnboardingState(data.onboardingState),
  };
  if (backgroundImageFromFile !== undefined) {
    base.backgroundImage = backgroundImageFromFile;
  }

  if (data.mapScale && typeof data.mapScale === 'object' && data.mapScale !== null) {
    const ms = data.mapScale as Record<string, unknown>;
    if (
      ms.start &&
      typeof ms.start === 'object' &&
      ms.end &&
      typeof ms.end === 'object'
    ) {
      const s = ms.start as { x?: number; y?: number };
      const e = ms.end as { x?: number; y?: number };
      if (
        typeof s.x === 'number' &&
        typeof s.y === 'number' &&
        typeof e.x === 'number' &&
        typeof e.y === 'number'
      ) {
        base.mapScale = {
          start: { x: s.x, y: s.y },
          end: { x: e.x, y: e.y },
          linePhysicalLength:
            typeof ms.linePhysicalLength === 'number' &&
            Number.isFinite(ms.linePhysicalLength)
              ? ms.linePhysicalLength
              : 1,
        };
      }
    }
  }

  if (
    typeof data.backgroundOpacity === 'number' &&
    Number.isFinite(data.backgroundOpacity)
  ) {
    base.backgroundOpacity = data.backgroundOpacity;
  }

  return base;
};

/** @deprecated Use `parseGardenDocument` */
export const parsePermaplannerDocument = parseGardenDocument;

export type PermaplannerFileV1 = GardenDocument;
