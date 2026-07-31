import { computed, ref, type Ref } from 'vue';

import {
  buildCatalogPickGroups,
  catalogPickForSpeciesCultivar,
  defaultCatalogPick,
  type CatalogPlantPick,
} from './catalogPlantPick';
import type {
  GardenThing,
  Guild,
  GuildFunction,
  GuildLayer,
  MulchLevel,
} from './gardenTypes';
import { buildGroupedGuildPlants, type GuildPlantGroupRow } from './guildPlantGroups';
import { formatGuildMapDimensions, pathBounds } from './guildPathBounds';
import type { GrowthPhase, PlantVigor } from './guildPlantInstanceStatus';
import {
  fruitBloomMonthCountsForPhenologies,
  phenologySummaryForPlant,
  plantCatalog,
  resolvePhenology,
} from './plantCatalog';
import { guildPlantTooltipRows } from './guildPlantTooltips';
import { plantGuildGroupEnglishLabel } from './resolvePlant';
import { useGardenStore } from './useGardenStore';
import { useMapScaleStore } from './useMapScaleStore';

type PlantEditor =
  | { kind: 'add' }
  | { kind: 'edit'; plantId: string; thingIds: string[] };

export const useGuildCardModel = (guildId: Ref<string>) => {
  const garden = useGardenStore();
  const mapScale = useMapScaleStore();

  const guild = computed((): Guild => {
    const g = garden.guilds.find((x) => x.id === guildId.value);
    if (!g) {
      throw new Error(`Guild not found: ${guildId.value}`);
    }
    return g;
  });

  const editingName = ref<string | null>(null);
  const editingNote = ref<string | null>(null);
  const plantEditor = ref<PlantEditor | null>(null);
  const selectedPick = ref<CatalogPlantPick | null>(null);
  const expandedPlantGroupId = ref<string | null>(null);

  const displayedName = computed(() => editingName.value ?? guild.value.name);
  const displayedNote = computed(() => editingNote.value ?? guild.value.note ?? '');

  const catalogSpecies = () => plantCatalog.species.filter((s) => s.id !== 'unknown');

  const catalogPickForUserPlant = (userPlantId: string): CatalogPlantPick | null => {
    const up = garden.plants.find((p) => p.id === userPlantId);
    if (!up) {
      return null;
    }
    const groups = buildCatalogPickGroups(catalogSpecies());
    return (
      catalogPickForSpeciesCultivar(groups, up.speciesId, up.cultivarId ?? null) ??
      defaultCatalogPick(catalogSpecies())
    );
  };

  const setEditingName = (e: Event) => {
    editingName.value = (e.target as HTMLInputElement).value;
  };

  const commitName = () => {
    if (editingName.value === null) {
      return;
    }
    const value = editingName.value;
    editingName.value = null;
    garden.updateGuildName(guildId.value, value || '');
  };

  const setEditingNote = (e: Event) => {
    editingNote.value = (e.target as HTMLTextAreaElement).value;
  };

  const commitNote = () => {
    if (editingNote.value === null) {
      return;
    }
    const value = editingNote.value;
    editingNote.value = null;
    garden.updateGuildNote(guildId.value, value);
  };

  const onNoteKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') {
      return;
    }
    e.preventDefault();
    const el = e.target as HTMLTextAreaElement;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = `${el.value.slice(0, start)}\t${el.value.slice(end)}`;
    editingNote.value = next;
    requestAnimationFrame(() => {
      el.selectionStart = start + 1;
      el.selectionEnd = start + 1;
    });
  };

  const decrementGuildPlantQuantity = (thingIds: string[]) => {
    if (thingIds.length > 1) {
      garden.removeGuildThings(guildId.value, [thingIds[thingIds.length - 1]!]);
      return;
    }
    if (thingIds.length === 1) {
      garden.removeGuildThings(guildId.value, thingIds);
    }
  };

  const addOneGuildThing = (plantId: string) => {
    garden.addPlantToGuild(guildId.value, plantId);
  };

  const groupedGuildPlants = computed(() =>
    buildGroupedGuildPlants(guild.value.plants, (plantId) =>
      garden.resolvedPlant(plantId),
    ),
  );

  const openAddPlantEditor = () => {
    plantEditor.value = { kind: 'add' };
    selectedPick.value = null;
  };

  const openEditPlantEditor = (row: GuildPlantGroupRow) => {
    plantEditor.value = {
      kind: 'edit',
      plantId: row.plantId,
      thingIds: [...row.thingIds],
    };
    selectedPick.value = catalogPickForUserPlant(row.plantId);
  };

  const isEditingRow = (row: GuildPlantGroupRow): boolean => {
    const editor = plantEditor.value;
    return editor?.kind === 'edit' && editor.plantId === row.plantId;
  };

  const closePlantEditor = () => {
    plantEditor.value = null;
    selectedPick.value = null;
  };

  const onConfirmPlant = () => {
    if (!selectedPick.value) {
      return;
    }
    const { speciesId, cultivarId } = selectedPick.value;
    const editor = plantEditor.value;
    if (editor?.kind === 'edit') {
      garden.replaceGuildThingsWithCatalogPlant(
        guildId.value,
        editor.thingIds,
        speciesId,
        cultivarId,
      );
    } else {
      garden.addCatalogPlantToGuild(guildId.value, speciesId, cultivarId);
    }
    closePlantEditor();
  };

  const removeGuild = () => {
    garden.removeGuild(guildId.value);
  };

  const removeFromAerialMap = () => {
    garden.removeGuildFromAerialMap(guildId.value);
  };

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
    return formatGuildMapDimensions(pathBounds(guild.value.path), mapScale.unitLengthPx);
  });

  const mulchStars: MulchLevel[] = [1, 2, 3, 4, 5];

  const setMulchLevel = (level: MulchLevel) => {
    garden.setGuildMulchLevel(guildId.value, level);
  };

  const phenologySummaryForThingIds = (thingIds: string[]): string | null => {
    if (thingIds.length === 0) {
      return null;
    }
    const id0 = thingIds[0]!;
    const row = guild.value.plants.find((p) => p.id === id0);
    if (!row) {
      return null;
    }
    const rp = garden.resolvedPlant(row.plantId);
    return phenologySummaryForPlant(rp.speciesId, rp.cultivarId);
  };

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
    return fruitBloomMonthCountsForPhenologies(phenologies);
  });

  const compactPlantTags = computed(() =>
    groupedGuildPlants.value.map((row) => ({
      label: plantGuildGroupEnglishLabel(row.representativeResolved),
      plant: row.representativeResolved,
      count: row.count,
    })),
  );

  const togglePlantGroup = (plantId: string) => {
    expandedPlantGroupId.value = expandedPlantGroupId.value === plantId ? null : plantId;
  };

  const isPlantGroupExpanded = (plantId: string): boolean =>
    expandedPlantGroupId.value === plantId;

  const guildThing = (thingId: string): GardenThing | undefined =>
    guild.value.plants.find((t) => t.id === thingId);

  const setThingGrowthPhase = (thingId: string, raw: string) => {
    garden.setGuildThingGrowthPhase(guildId.value, thingId, raw as GrowthPhase | '');
  };

  const setThingVigorLevel = (thingId: string, vigor: PlantVigor | undefined) => {
    garden.setGuildThingVigor(guildId.value, thingId, vigor);
  };

  return {
    guild,
    editingName,
    editingNote,
    displayedName,
    displayedNote,
    plantEditor,
    selectedPick,
    setEditingName,
    commitName,
    setEditingNote,
    commitNote,
    onNoteKeydown,
    decrementGuildPlantQuantity,
    addOneGuildThing,
    groupedGuildPlants,
    openAddPlantEditor,
    openEditPlantEditor,
    isEditingRow,
    closePlantEditor,
    onConfirmPlant,
    removeGuild,
    removeFromAerialMap,
    guildFunctions,
    guildLayers,
    placedOnMap,
    guildMapSizeLabel,
    mulchStars,
    setMulchLevel,
    phenologySummaryForThingIds,
    guildTooltipRows,
    guildMonthPhenologyCounts,
    compactPlantTags,
    togglePlantGroup,
    isPlantGroupExpanded,
    guildThing,
    setThingGrowthPhase,
    setThingVigorLevel,
  };
};
