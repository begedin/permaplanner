import type { GardenThing, Plant } from './gardenTypes';
import {
  averagePlantVigor,
  type GrowthPhase,
  type PlantVigor,
} from './guildPlantInstanceStatus';
import { plantGuildGroupLabel } from './resolvePlant';

export const GROUP_HEADER_MAX_PHASE_ICONS = 8;

export type GuildPlantGroupRow = {
  plantId: string;
  label: string;
  count: number;
  instances: readonly GardenThing[];
  representativeResolved: Plant;
  headerPhaseSlots: { thingId: string; phase: GrowthPhase }[];
  showPhaseOverflow: boolean;
  averageVigor: PlantVigor | null;
};

export const plantGroupRowShowsHeaderExtras = (row: GuildPlantGroupRow): boolean =>
  row.headerPhaseSlots.length > 0 || row.showPhaseOverflow || row.averageVigor !== null;

export const buildGroupedGuildPlants = (
  things: readonly GardenThing[],
  resolvePlant: (plantId: string) => Plant,
): GuildPlantGroupRow[] => {
  const byPlantId = new Map<string, GardenThing[]>();
  for (const thing of things) {
    const group = byPlantId.get(thing.plantId);
    if (group) group.push(thing);
    else byPlantId.set(thing.plantId, [thing]);
  }

  const rows: GuildPlantGroupRow[] = [...byPlantId].map(([plantId, group]) => {
    const plant = resolvePlant(plantId);
    return {
      plantId: plant.id,
      label: plantGuildGroupLabel(plant),
      count: group.length,
      instances: group,
      representativeResolved: plant,
      headerPhaseSlots: group
        .slice(0, GROUP_HEADER_MAX_PHASE_ICONS)
        .flatMap((t) =>
          t.growthPhase !== undefined ? [{ thingId: t.id, phase: t.growthPhase }] : [],
        ),
      showPhaseOverflow: group.length > GROUP_HEADER_MAX_PHASE_ICONS,
      averageVigor: averagePlantVigor(group.map((t) => t.vigor)),
    };
  });

  rows.sort((a, b) => {
    const byName = a.representativeResolved.name.localeCompare(
      b.representativeResolved.name,
    );
    if (byName !== 0) {
      return byName;
    }
    return (a.representativeResolved.cultivarId ?? '').localeCompare(
      b.representativeResolved.cultivarId ?? '',
    );
  });
  return rows;
};
