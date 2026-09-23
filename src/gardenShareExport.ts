import type { GardenDocument } from './gardenDocument';
import type { Guild } from './gardenTypes';
import { GROWTH_PHASE_LABEL, PLANT_VIGOR_LABEL } from './guildPlantInstanceStatus';
import { withPersistedGuildPlantLabels } from './guildPlantLabels';

export type GardenSharePayload = {
  gardenName: string;
  guilds: Guild[];
  summary: string;
};

/** Summary of the current guild model; legacy conversion belongs at import. */
export const buildGardenShareSummary = (guilds: readonly Guild[]): string =>
  guilds
    .map((guild) => {
      const plants = guild.plants.map((plant) => {
        const condition =
          plant.vigor === undefined
            ? 'unknown'
            : `${PLANT_VIGOR_LABEL[plant.vigor]} (${plant.vigor}/5)`;
        const stage =
          plant.growthPhase === undefined
            ? 'unknown'
            : GROWTH_PHASE_LABEL[plant.growthPhase];
        return [
          `  - ${plant.nameOrCultivar.trim() || plant.plantId.trim() || '(unknown plant)'}`,
          `    - condition: ${condition}`,
          `    - stage: ${stage}`,
        ].join('\n');
      });
      return [
        guild.name.trim() || '(unnamed guild)',
        '',
        `- id: ${guild.id.trim() || 'n/a'}`,
        '- plants:',
        plants.join('\n') || '  - (none)',
        `- mulch level: ${guild.mulchLevel}/5`,
        `- note: ${guild.note?.trim() || '(none)'}`,
      ].join('\n');
    })
    .join('\n\n---\n\n') || '(no guilds)';

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
