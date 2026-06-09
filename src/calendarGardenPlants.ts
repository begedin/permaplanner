import type { CatalogPhenology } from './plantCatalog';
import { getSpecies, resolvePhenology } from './plantCatalog';
import type { Guild, Plant, UserPlant } from './gardenTypes';
import {
  averagePlantVigor,
  type GrowthPhase,
  type PlantVigor,
} from './guildPlantInstanceStatus';
import type { GuildPlantTooltipRow } from './guildPlantTooltips';
import { guildPlantTooltipRows } from './guildPlantTooltips';
import { plantDisplayLabel } from './resolvePlant';
import type { PlantIconId } from './plantIcons/iconIds';

const GROUP_HEADER_MAX_PHASE_ICONS = 8;

export type GardenSpeciesSidebarRow = {
  speciesId: string;
  name: string;
  nameLatin: string;
  iconId: PlantIconId;
  cultivarCount: number;
  plantCount: number;
  producesFruit: boolean;
  cultivarLabels: string;
  cultivarLatinLabels: string;
};

export type CalendarCultivarRow = {
  userPlantId: string;
  label: string;
  resolved: Plant;
  phenology: CatalogPhenology;
  guildInstanceCount: number;
  headerPhaseSlots: { thingId: string; phase: GrowthPhase }[];
  showPhaseOverflow: boolean;
  averageVigor: PlantVigor | null;
  tooltipRows: GuildPlantTooltipRow[];
};

export const formatSpeciesCounts = (
  cultivarCount: number,
  plantCount: number,
): string => {
  const cultivars = `${cultivarCount} ${cultivarCount === 1 ? 'cultivar' : 'cultivars'}`;
  const plants = `${plantCount} ${plantCount === 1 ? 'plant' : 'plants'}`;
  return `${cultivars} · ${plants}`;
};

/** Counts from guild bed placements only (not the Plants catalog). */
export const guildSpeciesCounts = (
  guilds: readonly Guild[],
  speciesId: string,
  resolvePlant: (id: string) => Plant,
): { cultivarCount: number; plantCount: number } => {
  const cultivarKeys = new Set<string>();
  let plantCount = 0;

  for (const thing of guilds.flatMap((guild) => guild.plants)) {
    const rp = resolvePlant(thing.plantId);
    if (rp.speciesId !== speciesId) {
      continue;
    }
    plantCount++;
    cultivarKeys.add(rp.cultivarId ?? '__default__');
  }

  return { cultivarCount: cultivarKeys.size, plantCount };
};

/** Guild calendar tooltip rows for one species (one row per user plant, counted by bed instances). */
export const guildSpeciesTooltipRows = (
  guilds: readonly Guild[],
  speciesId: string,
  resolvePlant: (id: string) => Plant,
): GuildPlantTooltipRow[] =>
  guildPlantTooltipRows(
    guilds
      .flatMap((guild) => guild.plants)
      .filter((thing) => resolvePlant(thing.plantId).speciesId === speciesId)
      .map((thing) => thing.plantId),
    resolvePlant,
  );

export const listGardenSpecies = (
  guilds: readonly Guild[],
  resolvePlant: (id: string) => Plant,
): GardenSpeciesSidebarRow[] => {
  const bySpecies = new Map<
    string,
    {
      name: string;
      nameLatin: string;
      iconId: PlantIconId;
      cultivarLabels: Set<string>;
      cultivarLatinLabels: Set<string>;
      producesFruit: boolean;
    }
  >();

  for (const thing of guilds.flatMap((guild) => guild.plants)) {
    const rp = resolvePlant(thing.plantId);
    if (rp.speciesId === 'unknown') {
      continue;
    }

    let bucket = bySpecies.get(rp.speciesId);
    if (!bucket) {
      const species = getSpecies(rp.speciesId);
      bucket = {
        name: rp.name,
        nameLatin: species?.name_latin ?? '',
        iconId: species?.defaultIconId ?? rp.iconId,
        cultivarLabels: new Set(),
        cultivarLatinLabels: new Set(),
        producesFruit: false,
      };
      bySpecies.set(rp.speciesId, bucket);
    }

    bucket.cultivarLabels.add(plantDisplayLabel(rp));
    if (rp.cultivarLatin) {
      bucket.cultivarLatinLabels.add(rp.cultivarLatin);
    }
    if (resolvePhenology(rp.speciesId, rp.cultivarId).fruiting !== undefined) {
      bucket.producesFruit = true;
    }
  }

  return [...bySpecies.entries()]
    .map(([speciesId, bucket]) => {
      const { cultivarCount, plantCount } = guildSpeciesCounts(
        guilds,
        speciesId,
        resolvePlant,
      );
      return {
        speciesId,
        name: bucket.name,
        nameLatin: bucket.nameLatin,
        iconId: bucket.iconId,
        cultivarCount,
        plantCount,
        producesFruit: bucket.producesFruit,
        cultivarLabels: [...bucket.cultivarLabels].sort().join(' '),
        cultivarLatinLabels: [...bucket.cultivarLatinLabels].sort().join(' '),
      };
    })
    .sort((a, b) => {
      if (b.cultivarCount !== a.cultivarCount) {
        return b.cultivarCount - a.cultivarCount;
      }
      if (a.producesFruit !== b.producesFruit) {
        return a.producesFruit ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
};

export const speciesIsPlacedInGuilds = (
  guilds: readonly Guild[],
  speciesId: string,
  resolvePlant: (id: string) => Plant,
): boolean => guildSpeciesCounts(guilds, speciesId, resolvePlant).plantCount > 0;

export const listCalendarCultivarsForSpecies = (
  userPlants: readonly UserPlant[],
  speciesId: string,
  guilds: readonly Guild[],
  resolvePlant: (id: string) => Plant,
): CalendarCultivarRow[] => {
  const rows: CalendarCultivarRow[] = [];
  for (const up of userPlants) {
    const rp = resolvePlant(up.id);
    if (rp.speciesId !== speciesId) {
      continue;
    }
    const things = guilds.flatMap((guild) =>
      guild.plants.filter((thing) => thing.plantId === up.id),
    );
    if (things.length === 0) {
      continue;
    }
    const phenology = resolvePhenology(rp.speciesId, rp.cultivarId);
    rows.push({
      userPlantId: up.id,
      label: plantDisplayLabel(rp),
      resolved: rp,
      phenology,
      guildInstanceCount: things.length,
      headerPhaseSlots: things
        .slice(0, GROUP_HEADER_MAX_PHASE_ICONS)
        .flatMap((t) =>
          t.growthPhase !== undefined ? [{ thingId: t.id, phase: t.growthPhase }] : [],
        ),
      showPhaseOverflow: things.length > GROUP_HEADER_MAX_PHASE_ICONS,
      averageVigor: averagePlantVigor(things.map((t) => t.vigor)),
      tooltipRows: guildPlantTooltipRows(
        things.map(() => up.id),
        () => rp,
      ),
    });
  }
  rows.sort((a, b) => a.label.localeCompare(b.label));
  return rows;
};
