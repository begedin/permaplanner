import { computed, type Ref } from 'vue';
import type { GuildFunction, GuildLayer } from './gardenTypes';
import { buildGroupedGuildPlants } from './guildPlantGroups';
import { formatGuildMapDimensions, pathBounds } from './guildPathBounds';
import { harvestBloomMonthCountsForPhenologies, resolvePhenology } from './plantCatalog';
import { guildPlantTooltipRows } from './guildPlantTooltips';
import { plantGuildGroupEnglishLabel } from './resolvePlant';
import { useGardenStore } from './useGardenStore';
import { useMapScaleStore } from './useMapScaleStore';

export const useGuildSummary = (guildId: Ref<string>) => {
  const garden = useGardenStore();
  const mapScale = useMapScaleStore();
  const guild = computed(() => {
    const g = garden.guilds.find((x) => x.id === guildId.value);
    if (!g) {
      throw new Error(`Guild not found: ${guildId.value}`);
    }
    return g;
  });

  const groupedGuildPlants = computed(() =>
    buildGroupedGuildPlants(guild.value.plants, (plantId) =>
      garden.resolvedPlant(plantId),
    ),
  );

  const guildFunctions = computed(() => {
    const functionsByName = {
      nitrogen_fixer: { label: 'Nitrogen Fixer', count: 0 },
      dynamic_accumulator: { label: 'Dynamic Accumulator', count: 0 },
      pollinator_attractor: { label: 'Pollinator Attractor', count: 0 },
      pest_repellent: { label: 'Pest Repellent', count: 0 },
      ground_cover: { label: 'Ground Cover', count: 0 },
      wildfire_suppressor: { label: 'Wildfire Suppressor', count: 0 },
      mulcher: { label: 'Mulcher', count: 0 },
      edible: { label: 'Edible', count: 0 },
      medicinal: { label: 'Medicinal', count: 0 },
    } satisfies Record<GuildFunction, { label: string; count: number }>;

    guild.value.plants.forEach((thing) => {
      const plant = garden.resolvedPlant(thing.plantId);
      plant.functions.forEach((f) => {
        functionsByName[f].count++;
      });
    });

    return functionsByName;
  });

  const guildLayers = computed(() => {
    const layersByName = {
      overstory: { label: 'Overstory', count: 0 },
      understory: { label: 'Understory', count: 0 },
      shrub: { label: 'Shrub', count: 0 },
      ground_cover: { label: 'Ground Cover', count: 0 },
      vine: { label: 'Vine', count: 0 },
      herb: { label: 'Herb', count: 0 },
      root: { label: 'Root', count: 0 },
    } satisfies Record<GuildLayer, { label: string; count: number }>;

    guild.value.plants.forEach((thing) => {
      const plant = garden.resolvedPlant(thing.plantId);
      plant.layers.forEach((layer) => {
        layersByName[layer].count++;
      });
    });

    return layersByName;
  });

  const placedOnMap = computed(() => guild.value.path.length > 0);

  const guildMapSizeLabel = computed(() => {
    if (!placedOnMap.value) {
      return null;
    }
    const size = formatGuildMapDimensions(
      pathBounds(guild.value.path.flat(2)),
      mapScale.unitLengthPx,
    );
    return size ? `${size} ${mapScale.unitLabel}` : null;
  });

  const guildTooltipRows = computed(() =>
    guildPlantTooltipRows(
      guild.value.plants.map((thing) => thing.plantId),
      (plantId) => garden.resolvedPlant(plantId),
    ),
  );

  const guildMonthPhenologyCounts = computed(() => {
    const phenologies = guild.value.plants.map((thing) => {
      const rp = garden.resolvedPlant(thing.plantId);
      return resolvePhenology(rp.speciesId, rp.cultivarId);
    });
    return harvestBloomMonthCountsForPhenologies(phenologies);
  });

  const compactPlantTags = computed(() =>
    groupedGuildPlants.value.map((row) => ({
      label: plantGuildGroupEnglishLabel(row.representativeResolved),
      plant: row.representativeResolved,
      count: row.count,
    })),
  );

  return {
    guild,
    groupedGuildPlants,
    guildFunctions,
    guildLayers,
    placedOnMap,
    guildMapSizeLabel,
    guildTooltipRows,
    guildMonthPhenologyCounts,
    compactPlantTags,
  };
};
