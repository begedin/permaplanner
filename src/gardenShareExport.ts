import type { GardenDocument } from './gardenDocument';
import type { Guild } from './gardenTypes';
import {
  GROWTH_PHASE_LABEL,
  PLANT_VIGOR_LABEL,
  type GrowthPhase,
  type PlantVigor,
} from './guildPlantInstanceStatus';
import { withPersistedGuildPlantLabels } from './permaplannerFileExport';

export type GardenSharePayload = {
  gardenName: string;
  guilds: Guild[];
  summary: string;
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

const trimmedString = (v: unknown): string | undefined => {
  if (typeof v !== 'string') {
    return undefined;
  }
  const trimmed = v.trim();
  return trimmed === '' ? undefined : trimmed;
};

const guildDisplayName = (guild: Record<string, unknown>): string =>
  trimmedString(guild.name) ?? '(unnamed guild)';

const guildId = (guild: Record<string, unknown>): string =>
  trimmedString(guild.id) ?? 'n/a';

const guildMulchLevel = (guild: Record<string, unknown>): number => {
  const raw = guild.mulchLevel;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const rounded = Math.round(raw);
    if (rounded >= 1 && rounded <= 5) {
      return rounded;
    }
  }
  const parsed = Number.parseInt(String(raw ?? ''), 10);
  return parsed >= 1 && parsed <= 5 ? parsed : 1;
};

const guildNote = (guild: Record<string, unknown>): string =>
  trimmedString(guild.note) ?? '(none)';

const plantDisplayName = (plant: Record<string, unknown>): string => {
  const fromName = trimmedString(plant.name);
  if (fromName) {
    return fromName;
  }
  const fromCultivar = trimmedString(plant.nameOrCultivar);
  if (fromCultivar) {
    return fromCultivar;
  }
  return trimmedString(plant.plantId) ?? '(unknown plant)';
};

const plantCondition = (plant: Record<string, unknown>): string => {
  const parsed = Number.parseInt(String(plant.vigor ?? ''), 10);
  if (parsed >= 1 && parsed <= 5) {
    const label = PLANT_VIGOR_LABEL[parsed as PlantVigor] ?? 'unknown';
    return `${label} (${parsed}/5)`;
  }
  return trimmedString(plant.condition) ?? 'unknown';
};

const plantStage = (plant: Record<string, unknown>): string => {
  const phase = trimmedString(plant.growthPhase);
  if (phase && phase in GROWTH_PHASE_LABEL) {
    return GROWTH_PHASE_LABEL[phase as GrowthPhase];
  }
  return trimmedString(plant.stage) ?? 'unknown';
};

const plantLines = (plants: unknown): string => {
  if (!Array.isArray(plants) || plants.length === 0) {
    return '  - (none)';
  }
  return plants
    .filter(isRecord)
    .map((plant) => {
      const name = plantDisplayName(plant);
      const condition = plantCondition(plant);
      const stage = plantStage(plant);
      return [
        `  - ${name}`,
        `    - condition: ${condition}`,
        `    - stage: ${stage}`,
      ].join('\n');
    })
    .join('\n');
};

const guildBlock = (guild: Record<string, unknown>): string => {
  const name = guildDisplayName(guild);
  const mulch = guildMulchLevel(guild);
  const note = guildNote(guild);
  const id = guildId(guild);
  return [
    name,
    '',
    `- id: ${id}`,
    '- plants:',
    plantLines(guild.plants),
    `- mulch level: ${mulch}/5`,
    `- note: ${note}`,
  ].join('\n');
};

export const buildGardenShareSummary = (guilds: unknown[]): string => {
  const blocks = guilds
    .filter(isRecord)
    .map(guildBlock)
    .filter((block) => block !== '');
  if (blocks.length === 0) {
    return '(no guilds)';
  }
  return blocks.join('\n\n---\n\n');
};

export const buildGardenSharePayload = (
  gardenName: string,
  snapshot: GardenDocument,
): GardenSharePayload => {
  const normalized = withPersistedGuildPlantLabels(snapshot);
  const guilds = normalized.guilds;
  return {
    gardenName,
    guilds,
    summary: buildGardenShareSummary(guilds),
  };
};

export const buildGardenShareJsonText = (
  gardenName: string,
  snapshot: GardenDocument,
): string => JSON.stringify(buildGardenSharePayload(gardenName, snapshot), null, 2);
