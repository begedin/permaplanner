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
  thingIds: string[];
  representativeResolved: Plant;
  headerPhaseSlots: { thingId: string; phase: GrowthPhase }[];
  showPhaseOverflow: boolean;
  averageVigor: PlantVigor | null;
};

export const plantGroupRowShowsHeaderExtras = (row: GuildPlantGroupRow): boolean =>
  row.headerPhaseSlots.length > 0 || row.showPhaseOverflow || row.averageVigor !== null;

export const buildGroupedGuildPlants = (
  things: GardenThing[],
  resolvePlant: (plantId: string) => Plant,
): GuildPlantGroupRow[] => {
  const byPlantId = new Map<string, { thingIds: string[]; rp: Plant }>();
  for (const thing of things) {
    const rp = resolvePlant(thing.plantId);
    let bucket = byPlantId.get(thing.plantId);
    if (!bucket) {
      bucket = { thingIds: [], rp };
      byPlantId.set(thing.plantId, bucket);
    }
    bucket.thingIds.push(thing.id);
  }

  const rows: GuildPlantGroupRow[] = [...byPlantId.values()].map(({ thingIds, rp }) => {
    const groupThings = thingIds
      .map((id) => things.find((t) => t.id === id))
      .filter((t): t is GardenThing => t !== undefined);
    return {
      plantId: rp.id,
      label: plantGuildGroupLabel(rp),
      count: thingIds.length,
      thingIds,
      representativeResolved: rp,
      headerPhaseSlots: groupThings
        .slice(0, GROUP_HEADER_MAX_PHASE_ICONS)
        .flatMap((t) =>
          t.growthPhase !== undefined ? [{ thingId: t.id, phase: t.growthPhase }] : [],
        ),
      showPhaseOverflow: groupThings.length > GROUP_HEADER_MAX_PHASE_ICONS,
      averageVigor: averagePlantVigor(groupThings.map((t) => t.vigor)),
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
