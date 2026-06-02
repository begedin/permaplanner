<script lang="ts" setup>
  import { computed, ref } from 'vue';

  import HighlightText from './HighlightText.vue';
  import {
    buildCatalogPickGroups,
    catalogPickForSpeciesCultivar,
    defaultCatalogPick,
    type CatalogPlantPick,
  } from './catalogPlantPick';
  import type { GardenThing, Guild, MulchLevel, Plant, UserPlant } from './gardenTypes';
  import type { GuildFunction, GuildLayer } from './useGardenStore';
  import { formatGuildMapDimensions, pathBounds } from './guildPathBounds';
  import {
    averagePlantVigor,
    GROWTH_PHASE_LABEL,
    GROWTH_PHASES_FOR_SELECT,
    type GrowthPhase,
    type PlantVigor,
  } from './guildPlantInstanceStatus';
  import { useGardenStore } from './useGardenStore';
  import { useGuildSearch } from './useGuildSearch';
  import { useGuildSelection } from './useGuildSelection';
  import { useMapScaleStore } from './useMapScaleStore';
  import {
    CATALOG_MONTH_LABELS,
    CATALOG_MONTH_LABELS_2,
    fruitBloomMonthCountsForPhenologies,
    phenologySummaryForPlant,
    resolvePhenology,
  } from './plantCatalog';
  import GrowthPhaseIcon from './GrowthPhaseIcon.vue';
  import GuildCardSectionLabel from './GuildCardSectionLabel.vue';
  import GuildPlantQuantityRemoveButton from './GuildPlantQuantityRemoveButton.vue';
  import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
  import PlantIcon from './PlantIcon.vue';
  import PlantVigorIcon from './PlantVigorIcon.vue';
  import PlantVigorRating from './PlantVigorRating.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import {
    functionLabelTooltip,
    guildPlantTooltipRows,
    layerLabelTooltip,
    monthAspectTooltip,
    monthHeaderTooltip,
  } from './guildPlantTooltips';
  import { plantDisplayLabel, plantGuildGroupLabel } from './resolvePlant';
  import { plantCatalog } from './plantCatalog';
  import { uuid } from './utils';

  const GROUP_HEADER_MAX_PHASE_ICONS = 8;

  type GuildPlantGroupRow = {
    plantId: string;
    label: string;
    count: number;
    thingIds: string[];
    representativeResolved: Plant;
    headerPhaseSlots: { thingId: string; phase: GrowthPhase }[];
    showPhaseOverflow: boolean;
    averageVigor: PlantVigor | null;
  };

  const plantGroupRowShowsHeaderExtras = (row: GuildPlantGroupRow): boolean =>
    row.headerPhaseSlots.length > 0 || row.showPhaseOverflow || row.averageVigor !== null;

  const garden = useGardenStore();
  const mapScale = useMapScaleStore();
  const { selectedGuildId, selectGuild } = useGuildSelection();
  const { searchQuery } = useGuildSearch();

  const props = defineProps<{
    guildId: string;
    /** Aerial sidebar: compact list row. Guilds: full edit card (selected panel / guilds tab). */
    context: 'aerialSidebar' | 'guilds';
    /** Stretch to the grid row height in multi-column guild list browse mode. */
    fillCell?: boolean;
  }>();

  const guild = computed((): Guild => {
    const g = garden.guilds.find((x) => x.id === props.guildId);
    if (!g) {
      throw new Error(`Guild not found: ${props.guildId}`);
    }
    return g;
  });

  type PlantEditor =
    | { kind: 'add' }
    | { kind: 'edit'; plantId: string; thingIds: string[] };

  const plantEditor = ref<PlantEditor | null>(null);
  const selectedPick = ref<CatalogPlantPick | null>(null);
  const expandedPlantGroupId = ref<string | null>(null);

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

  const findMatchingUserPlant = (): UserPlant | undefined => {
    const pick = selectedPick.value;
    if (!pick) {
      return undefined;
    }
    return garden.plants.find(
      (pl) =>
        pl.speciesId === pick.speciesId &&
        (pl.cultivarId ?? null) === (pick.cultivarId ?? null),
    );
  };

  const setName = (e: Event) => {
    guild.value.name = (e.target as HTMLInputElement)?.value || '';
  };

  const setNote = (e: Event) => {
    const value = (e.target as HTMLTextAreaElement)?.value ?? '';
    if (value === '') {
      delete guild.value.note;
    } else {
      guild.value.note = value;
    }
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
    if (next === '') {
      delete guild.value.note;
    } else {
      guild.value.note = next;
    }
    requestAnimationFrame(() => {
      el.selectionStart = start + 1;
      el.selectionEnd = start + 1;
    });
  };

  const removeGuildThingsByIds = (thingIds: string[]) => {
    if (thingIds.length === 0) {
      return;
    }
    const idSet = new Set(thingIds);
    for (let i = guild.value.plants.length - 1; i >= 0; i--) {
      if (idSet.has(guild.value.plants[i]!.id)) {
        guild.value.plants.splice(i, 1);
      }
    }
  };

  const decrementGuildPlantQuantity = (thingIds: string[]) => {
    if (thingIds.length > 1) {
      removeGuildThingsByIds([thingIds[thingIds.length - 1]!]);
      return;
    }
    if (thingIds.length === 1) {
      removeGuildThingsByIds(thingIds);
    }
  };

  const addOneGuildThing = (plantId: string) => {
    garden.addPlantToGuild(guild.value.id, plantId);
  };

  const groupedGuildPlants = computed((): GuildPlantGroupRow[] => {
    const byPlantId = new Map<string, { thingIds: string[]; rp: Plant }>();
    for (const thing of guild.value.plants) {
      const rp = garden.resolvedPlant(thing.plantId);
      let bucket = byPlantId.get(thing.plantId);
      if (!bucket) {
        bucket = { thingIds: [], rp };
        byPlantId.set(thing.plantId, bucket);
      }
      bucket.thingIds.push(thing.id);
    }
    const rows: GuildPlantGroupRow[] = [...byPlantId.values()].map(({ thingIds, rp }) => {
      const things = thingIds
        .map((id) => guild.value.plants.find((t) => t.id === id))
        .filter((t): t is GardenThing => t !== undefined);
      const avgVigor = averagePlantVigor(things.map((t) => t.vigor));
      return {
        plantId: rp.id,
        label: plantGuildGroupLabel(rp),
        count: thingIds.length,
        thingIds,
        representativeResolved: rp,
        headerPhaseSlots: things
          .slice(0, GROUP_HEADER_MAX_PHASE_ICONS)
          .flatMap((t) =>
            t.growthPhase !== undefined ? [{ thingId: t.id, phase: t.growthPhase }] : [],
          ),
        showPhaseOverflow: things.length > GROUP_HEADER_MAX_PHASE_ICONS,
        averageVigor: avgVigor,
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
  });

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
    let up = findMatchingUserPlant();
    if (!up) {
      up = { id: uuid(), speciesId, cultivarId };
      garden.plants.push(up);
    }
    const editor = plantEditor.value;
    if (editor?.kind === 'edit') {
      const rp = garden.resolvedPlant(up.id);
      const label = plantDisplayLabel(rp);
      for (const thingId of editor.thingIds) {
        const thing = guild.value.plants.find((t) => t.id === thingId);
        if (thing) {
          thing.plantId = up.id;
          thing.nameOrCultivar = label;
        }
      }
      closePlantEditor();
      return;
    }
    garden.addPlantToGuild(guild.value.id, up.id);
    closePlantEditor();
  };

  const removeGuild = () => {
    garden.removeGuild(guild.value.id);
  };

  const removeFromAerialMap = () => {
    garden.removeGuildFromAerialMap(guild.value.id);
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
    guild.value.mulchLevel = level;
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

  const guildMonthBlockClass = (rawCount: number): string => {
    const n = Math.min(5, rawCount);
    const classes = [
      'bg-parchment-300',
      'bg-sage-100',
      'bg-sage-200',
      'bg-sage-300',
      'bg-sage-400',
      'bg-sage-500',
    ];
    return classes[n] ?? classes[0]!;
  };

  const compactPlantTags = computed(() =>
    groupedGuildPlants.value.map((row) => ({
      label: row.label,
      count: row.count,
    })),
  );

  const onAerialListClick = () => {
    if (props.context === 'aerialSidebar') {
      void selectGuild(props.guildId);
    }
  };

  const onAerialListKeydown = (e: KeyboardEvent) => {
    if (props.context !== 'aerialSidebar') {
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void selectGuild(props.guildId);
    }
  };

  const togglePlantGroup = (plantId: string) => {
    expandedPlantGroupId.value = expandedPlantGroupId.value === plantId ? null : plantId;
  };

  const isPlantGroupExpanded = (plantId: string): boolean =>
    expandedPlantGroupId.value === plantId;

  const guildThing = (thingId: string): GardenThing | undefined =>
    guild.value.plants.find((t) => t.id === thingId);

  const setThingGrowthPhase = (thingId: string, raw: string) => {
    const thing = guildThing(thingId);
    if (!thing) {
      return;
    }
    if (raw === '') {
      delete thing.growthPhase;
    } else {
      thing.growthPhase = raw as GrowthPhase;
    }
  };

  const setThingVigorLevel = (thingId: string, vigor: PlantVigor | undefined) => {
    const thing = guildThing(thingId);
    if (!thing) {
      return;
    }
    if (vigor === undefined) {
      delete thing.vigor;
    } else {
      thing.vigor = vigor;
    }
  };
</script>

<template>
  <article
    class="flex flex-col gap-1 items-start justify-start p-2 text-ink-600 w-full"
    :class="{
      'h-full min-h-0': context === 'guilds',
      'h-full': context === 'aerialSidebar' && fillCell,
      'paper-card-interactive': context === 'aerialSidebar',
      'paper-card-selected': context === 'aerialSidebar' && selectedGuildId === guildId,
      'paper-card': context === 'guilds',
    }"
    :aria-label="guild.name"
    :aria-current="
      context === 'aerialSidebar' && selectedGuildId === guildId ? 'true' : undefined
    "
    :tabindex="context === 'aerialSidebar' ? 0 : undefined"
    @click="onAerialListClick"
    @keydown="onAerialListKeydown"
  >
    <template v-if="context === 'aerialSidebar'">
      <div class="flex flex-row items-start justify-between gap-2 w-full">
        <p class="font-medium text-ink-800 min-w-0 flex-1">
          <HighlightText
            :text="guild.name"
            :query="searchQuery"
          />
        </p>
        <div
          v-if="placedOnMap"
          class="flex flex-row items-center gap-1 shrink-0"
        >
          <span
            v-if="guildMapSizeLabel"
            class="text-[11px] leading-tight text-ink-500 tabular-nums"
            aria-label="Guild size on aerial map"
          >
            {{ guildMapSizeLabel }}
          </span>
          <button
            type="button"
            title="Remove from aerial map"
            aria-label="Remove from aerial map"
            class="btn-icon inline-flex size-6 shrink-0 items-center justify-center p-0.5 hover:bg-amber-100"
            @click.stop="removeFromAerialMap"
          >
            <UiIcon
              name="unmap"
              class="size-4"
            />
          </button>
        </div>
      </div>
      <div
        class="flex flex-wrap gap-1 w-full"
        aria-label="Plants in this guild"
      >
        <span
          v-for="(tag, i) in compactPlantTags"
          :key="`${tag.label}-${i}`"
          class="text-[11px] leading-tight text-ink-700 paper-chip px-1.5 py-0.5"
        >
          <HighlightText
            :text="tag.label"
            :query="searchQuery"
          /><template v-if="tag.count > 1"> ×{{ tag.count }}</template>
        </span>
        <span
          v-if="compactPlantTags.length === 0"
          class="text-xs text-ink-400 italic"
        >
          No plants
        </span>
      </div>
    </template>

    <template v-if="context === 'guilds'">
      <div class="flex flex-col flex-1 min-h-0 w-full gap-1">
        <div class="flex flex-col gap-1 w-full min-h-0 overflow-y-auto shrink -mx-2 px-2">
          <div class="flex flex-row items-center justify-between gap-2 w-full flex-wrap">
            <p
              v-if="!placedOnMap"
              class="text-xs text-amber-800 bg-amber-100/90 px-1.5 py-0.5 rounded-lg border border-amber-200/60"
            >
              Not on aerial
            </p>
            <div
              v-if="placedOnMap"
              class="flex flex-row items-center gap-1.5"
            >
              <span
                v-if="guildMapSizeLabel"
                class="text-xs text-ink-600 tabular-nums"
                aria-label="Guild size on aerial map"
              >
                {{ guildMapSizeLabel }}
              </span>
              <button
                type="button"
                title="Remove from aerial map"
                aria-label="Remove from aerial map"
                class="btn-icon inline-flex size-6 shrink-0 items-center justify-center p-0.5 hover:bg-amber-100"
                @click.stop="removeFromAerialMap"
              >
                <UiIcon
                  name="unmap"
                  class="size-4"
                />
              </button>
            </div>
            <button
              type="button"
              :class="placedOnMap ? '' : 'ml-auto'"
              class="btn-danger inline-flex items-center gap-1 text-xs rounded-lg px-2 py-0.5"
              aria-label="Delete"
              @click="removeGuild"
            >
              <UiIcon name="trash" />
              Delete
            </button>
          </div>
          <input
            class="appearance-none bg-transparent border-none focus:outline-none text-ink-600 w-full truncate"
            :value="guild.name"
            @input="setName"
          />
          <div
            role="radiogroup"
            aria-label="Mulch level"
            class="flex flex-row items-center gap-1.5 w-full"
          >
            <span class="text-xs text-ink-500 shrink-0">Mulch</span>
            <div class="flex flex-row gap-0.5 items-center">
              <span
                v-for="n in mulchStars"
                :key="n"
                role="radio"
                :aria-checked="guild.mulchLevel === n"
                tabindex="0"
                class="mulch-star"
                :class="n <= guild.mulchLevel ? 'mulch-star-filled' : 'mulch-star-empty'"
                :aria-label="`Mulch level ${n} of 5`"
                @click="setMulchLevel(n)"
                @keydown.enter.prevent="setMulchLevel(n)"
                @keydown.space.prevent="setMulchLevel(n)"
              >
                <UiIcon
                  :name="n <= guild.mulchLevel ? 'star' : 'star-outline'"
                  class="size-full"
                />
              </span>
            </div>
          </div>
          <div
            class="flex flex-col gap-1 w-full"
            aria-label="Plants in this guild"
          >
            <GuildCardSectionLabel>Plants</GuildCardSectionLabel>
            <template
              v-for="row in groupedGuildPlants"
              :key="row.plantId"
            >
              <div
                v-if="isEditingRow(row)"
                class="flex flex-row items-center gap-1 w-full border-b border-blossom-300 py-1 pl-1"
                aria-label="Edit guild plant"
              >
                <div class="min-w-0 flex-1">
                  <PlantCatalogCombobox
                    v-model="selectedPick"
                    @submit="onConfirmPlant"
                  />
                </div>
                <button
                  type="button"
                  class="shrink-0 text-sm btn-soft-muted btn-soft-sm disabled:opacity-50 py-1 px-2"
                  :disabled="!selectedPick"
                  aria-label="Save plant in guild"
                  @click.stop="onConfirmPlant"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="shrink-0 text-sm btn-soft-secondary btn-soft-sm py-1 px-2"
                  aria-label="Cancel editing plant"
                  @click.stop="closePlantEditor"
                >
                  Cancel
                </button>
              </div>
              <div
                v-else
                class="w-full border-b border-blossom-300"
              >
                <div class="pl-1 flex flex-row items-center w-full gap-1 py-0.5">
                  <button
                    type="button"
                    class="btn-icon bg-transparent hover:bg-blossom-100 p-0.5 shrink-0"
                    :aria-expanded="isPlantGroupExpanded(row.plantId)"
                    :aria-label="
                      isPlantGroupExpanded(row.plantId)
                        ? `Collapse ${row.label}`
                        : `Expand ${row.label}`
                    "
                    @click.stop="togglePlantGroup(row.plantId)"
                  >
                    <UiIcon
                      name="chevron-down"
                      class="size-4 transition-transform duration-150"
                      :class="isPlantGroupExpanded(row.plantId) ? 'rotate-180' : ''"
                    />
                  </button>
                  <PlantIcon
                    :title="row.label"
                    class="size-5 shrink-0"
                    :plant="row.representativeResolved"
                  />
                  <div class="min-w-0 flex-1 flex flex-col gap-0 text-left">
                    <span class="truncate text-sm leading-tight">
                      <HighlightText
                        :text="row.label"
                        :query="searchQuery"
                      /><template v-if="row.count > 1"> ({{ row.count }}) </template>
                    </span>
                    <span
                      v-if="phenologySummaryForThingIds(row.thingIds)"
                      class="text-[10px] leading-tight text-ink-500"
                    >
                      {{ phenologySummaryForThingIds(row.thingIds) }}
                    </span>
                  </div>
                  <div
                    v-if="plantGroupRowShowsHeaderExtras(row)"
                    class="flex flex-row items-center gap-0.5 shrink-0"
                  >
                    <GrowthPhaseIcon
                      v-for="slot in row.headerPhaseSlots"
                      :key="slot.thingId"
                      :phase="slot.phase"
                    />
                    <UiIcon
                      v-if="row.showPhaseOverflow"
                      name="ellipsis"
                      class="size-4 shrink-0 text-ink-400"
                      :title="`${row.count - GROUP_HEADER_MAX_PHASE_ICONS} more plants`"
                      aria-label="More plants"
                    />
                    <PlantVigorIcon
                      v-if="row.averageVigor"
                      :vigor="row.averageVigor"
                      class="ml-1"
                    />
                  </div>
                  <div class="flex flex-row items-center gap-0 shrink-0">
                    <button
                      type="button"
                      title="Edit plant in bed"
                      aria-label="Edit plant in bed"
                      class="btn-icon bg-transparent hover:bg-blossom-100 p-0.5 px-1"
                      @click.stop="openEditPlantEditor(row)"
                    >
                      <UiIcon name="edit" />
                    </button>
                    <button
                      type="button"
                      title="Add one plant to bed"
                      aria-label="Add one plant to bed"
                      class="btn-icon bg-transparent hover:bg-sage-100 p-0.5 px-1"
                      @click.stop="addOneGuildThing(row.plantId)"
                    >
                      <UiIcon name="add" />
                    </button>
                    <GuildPlantQuantityRemoveButton
                      :count="row.count"
                      @decrement="decrementGuildPlantQuantity(row.thingIds)"
                    />
                  </div>
                </div>
                <div
                  v-if="isPlantGroupExpanded(row.plantId)"
                  class="flex flex-col gap-1 pb-1 pl-7 pr-1"
                >
                  <div
                    v-for="(thingId, index) in row.thingIds"
                    :key="thingId"
                    class="flex flex-col gap-1 rounded-lg border border-parchment-300/80 bg-parchment-50/60 px-2 py-1.5"
                    :aria-label="
                      row.count > 1 ? `${row.label} instance ${index + 1}` : row.label
                    "
                  >
                    <span
                      v-if="row.count > 1"
                      class="text-[10px] font-medium text-ink-500"
                    >
                      #{{ index + 1 }}
                    </span>
                    <div class="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
                      <label
                        class="flex flex-row items-center gap-1 text-[11px] text-ink-600"
                      >
                        <span class="shrink-0">Phase</span>
                        <select
                          class="min-w-0 max-w-[9.5rem] rounded-md border border-parchment-400/70 bg-white px-1 py-0.5 text-[11px] text-ink-700"
                          :value="guildThing(thingId)?.growthPhase ?? ''"
                          @change="
                            setThingGrowthPhase(
                              thingId,
                              ($event.target as HTMLSelectElement).value,
                            )
                          "
                        >
                          <option value="">—</option>
                          <option
                            v-for="phase in GROWTH_PHASES_FOR_SELECT"
                            :key="phase"
                            :value="phase"
                          >
                            {{ GROWTH_PHASE_LABEL[phase] }}
                          </option>
                        </select>
                      </label>
                      <label
                        class="flex flex-row items-center gap-1 text-[11px] text-ink-600"
                      >
                        <span class="shrink-0">Condition</span>
                        <PlantVigorRating
                          :vigor="guildThing(thingId)?.vigor"
                          @update:vigor="setThingVigorLevel(thingId, $event)"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <button
              v-if="!plantEditor"
              type="button"
              title="Add plant to guild"
              aria-label="Add plant to guild"
              class="btn-icon self-start bg-transparent hover:bg-parchment-200 p-0.5 px-1 text-sm leading-none border border-dashed border-parchment-400/50"
              @click.stop="openAddPlantEditor"
            >
              <UiIcon name="add" />
            </button>
            <div
              v-else-if="plantEditor?.kind === 'add'"
              class="flex flex-row items-center gap-1 w-full border-b border-blossom-300 py-1"
              aria-label="Add guild plant"
            >
              <div class="min-w-0 flex-1">
                <PlantCatalogCombobox
                  v-model="selectedPick"
                  @submit="onConfirmPlant"
                />
              </div>
              <button
                type="button"
                class="shrink-0 text-sm btn-soft-muted btn-soft-sm disabled:opacity-50 py-1 px-2"
                :disabled="!selectedPick"
                aria-label="Add to guild"
                @click.stop="onConfirmPlant"
              >
                Add
              </button>
              <button
                type="button"
                class="shrink-0 text-sm btn-soft-secondary btn-soft-sm py-1 px-2"
                aria-label="Cancel adding plant"
                @click.stop="closePlantEditor"
              >
                Cancel
              </button>
            </div>
          </div>
          <div class="flex flex-col gap-1 w-full">
            <GuildCardSectionLabel>Functions</GuildCardSectionLabel>
            <div class="flex flex-row flex-wrap gap-1 w-full">
              <div
                v-for="(f, fnKey) in guildFunctions"
                :key="fnKey"
                class="status-chip"
                :class="{
                  'bg-red-200': f.count == 0,
                  'bg-sage-200': f.count == 1,
                  'bg-sage-500 text-white': f.count > 1,
                }"
                :aria-label="`${f.label}`"
                :title="functionLabelTooltip(guildTooltipRows, fnKey, f.label)"
              >
                {{ f.label }}
                <span
                  v-if="f.count > 1"
                  class="text-ink-500 bg-parchment-300/80 rounded-lg px-1 text-xs"
                >
                  {{ f.count }}
                </span>
              </div>
            </div>
          </div>
          <div class="flex flex-col gap-1 w-full">
            <GuildCardSectionLabel>Layers</GuildCardSectionLabel>
            <div class="flex flex-row flex-wrap gap-1 w-full">
              <div
                v-for="(l, layerKey) in guildLayers"
                :key="layerKey"
                class="status-chip"
                :class="{
                  'bg-red-200': l.count == 0,
                  'bg-sage-200': l.count == 1,
                  'bg-sage-500 text-white': l.count > 1,
                }"
                :aria-label="`${l.label}`"
                :title="layerLabelTooltip(guildTooltipRows, layerKey, l.label)"
              >
                {{ l.label }}
                <span
                  v-if="l.count > 1"
                  class="text-xs text-ink-500 bg-parchment-300/80 rounded-lg px-1"
                >
                  {{ l.count }}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div
          class="flex flex-col gap-1 w-full shrink-0"
          aria-label="Guild fruit and bloom by month"
        >
          <GuildCardSectionLabel>Season</GuildCardSectionLabel>
          <div
            class="flex flex-row items-end gap-1 w-full"
            aria-label="Months"
          >
            <span
              class="w-9 shrink-0"
              aria-hidden="true"
            />
            <div class="flex flex-row gap-0.5 flex-1 min-w-0">
              <span
                v-for="(lab, i) in CATALOG_MONTH_LABELS_2"
                :key="`mh-${i}`"
                class="flex-1 min-w-0 text-center text-[10px] leading-none font-medium text-ink-500"
                :title="monthHeaderTooltip(guildTooltipRows, i, CATALOG_MONTH_LABELS[i])"
              >
                {{ lab }}
              </span>
            </div>
          </div>
          <div
            class="flex flex-row items-center gap-1 w-full"
            role="group"
            aria-label="Fruiting by month"
          >
            <span class="text-[10px] text-ink-500 w-9 shrink-0">Fruit</span>
            <div
              class="flex flex-row gap-0.5 flex-1 min-w-0"
              role="list"
            >
              <div
                v-for="(count, i) in guildMonthPhenologyCounts.fruiting"
                :key="`f-${i}`"
                role="listitem"
                class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
                :class="guildMonthBlockClass(count)"
                :title="
                  monthAspectTooltip(
                    guildTooltipRows,
                    i,
                    'fruiting',
                    CATALOG_MONTH_LABELS[i],
                  )
                "
              />
            </div>
          </div>
          <div
            class="flex flex-row items-center gap-1 w-full"
            role="group"
            aria-label="Blooming by month"
          >
            <span class="text-[10px] text-ink-500 w-9 shrink-0">Bloom</span>
            <div
              class="flex flex-row gap-0.5 flex-1 min-w-0"
              role="list"
            >
              <div
                v-for="(count, i) in guildMonthPhenologyCounts.blooming"
                :key="`b-${i}`"
                role="listitem"
                class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
                :class="guildMonthBlockClass(count)"
                :title="
                  monthAspectTooltip(
                    guildTooltipRows,
                    i,
                    'blooming',
                    CATALOG_MONTH_LABELS[i],
                  )
                "
              />
            </div>
          </div>
        </div>
        <div class="flex flex-col flex-1 min-h-0 w-full gap-1 pt-1">
          <GuildCardSectionLabel>Note</GuildCardSectionLabel>
          <textarea
            class="input-soft w-full flex-1 min-h-0 resize-none p-2 text-sm text-ink-800 leading-relaxed"
            :value="guild.note ?? ''"
            aria-label="Guild note"
            placeholder="Notes for this guild…"
            @input="setNote"
            @keydown="onNoteKeydown"
          />
        </div>
      </div>
    </template>

    <div
      v-if="context === 'aerialSidebar'"
      class="flex flex-col gap-1 w-full"
      :class="{ 'mt-auto': fillCell }"
      aria-label="Guild fruit and bloom by month"
    >
      <GuildCardSectionLabel>Season</GuildCardSectionLabel>
      <div
        class="flex flex-row items-end gap-1 w-full"
        aria-label="Months"
      >
        <span
          class="w-9 shrink-0"
          aria-hidden="true"
        />
        <div class="flex flex-row gap-0.5 flex-1 min-w-0">
          <span
            v-for="(lab, i) in CATALOG_MONTH_LABELS_2"
            :key="`mh-${i}`"
            class="flex-1 min-w-0 text-center text-[10px] leading-none font-medium text-ink-500"
            :title="monthHeaderTooltip(guildTooltipRows, i, CATALOG_MONTH_LABELS[i])"
          >
            {{ lab }}
          </span>
        </div>
      </div>
      <div
        class="flex flex-row items-center gap-1 w-full"
        role="group"
        aria-label="Fruiting by month"
      >
        <span class="text-[10px] text-ink-500 w-9 shrink-0">Fruit</span>
        <div
          class="flex flex-row gap-0.5 flex-1 min-w-0"
          role="list"
        >
          <div
            v-for="(count, i) in guildMonthPhenologyCounts.fruiting"
            :key="`f-${i}`"
            role="listitem"
            class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
            :class="guildMonthBlockClass(count)"
            :title="
              monthAspectTooltip(guildTooltipRows, i, 'fruiting', CATALOG_MONTH_LABELS[i])
            "
          />
        </div>
      </div>
      <div
        class="flex flex-row items-center gap-1 w-full"
        role="group"
        aria-label="Blooming by month"
      >
        <span class="text-[10px] text-ink-500 w-9 shrink-0">Bloom</span>
        <div
          class="flex flex-row gap-0.5 flex-1 min-w-0"
          role="list"
        >
          <div
            v-for="(count, i) in guildMonthPhenologyCounts.blooming"
            :key="`b-${i}`"
            role="listitem"
            class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
            :class="guildMonthBlockClass(count)"
            :title="
              monthAspectTooltip(guildTooltipRows, i, 'blooming', CATALOG_MONTH_LABELS[i])
            "
          />
        </div>
      </div>
    </div>
  </article>
</template>
