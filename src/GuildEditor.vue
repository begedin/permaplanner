<script lang="ts" setup>
  import { computed, ref, toRef } from 'vue';
  import { phenologySummaryForPlant } from './plantCatalog';
  import { hasPlantPlacement } from './gardenTypes';
  import type { GuildLayer } from './gardenTypes';

  import HighlightText from './HighlightText.vue';
  import {
    GROWTH_PHASE_LABEL,
    GROWTH_PHASES_FOR_SELECT,
  } from './guildPlantInstanceStatus';
  import {
    GROUP_HEADER_MAX_PHASE_ICONS,
    plantGroupRowShowsHeaderExtras,
  } from './guildPlantGroups';
  import { functionLabelTooltip, layerLabelTooltip } from './guildPlantTooltips';
  import GrowthPhaseIcon from './GrowthPhaseIcon.vue';
  import GuildCardSectionLabel from './GuildCardSectionLabel.vue';
  import ObservationDialog from './ObservationDialog.vue';
  import { newestObservationFirst, observationTypeLabels } from './observations';
  import { useGardenStore } from './useGardenStore';
  import GuildSeasonStrip from './GuildSeasonStrip.vue';
  import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
  import PlantIcon from './PlantIcon.vue';
  import PlantVigorIcon from './PlantVigorIcon.vue';
  import PlantVigorRating from './PlantVigorRating.vue';
  import RadioButtonGroup from './RadioButtonGroup.vue';
  import ToggleButton from './ToggleButton.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { useGuildSummary } from './useGuildSummary';
  import { useGuildEditor } from './useGuildEditor';
  import { useGuildSearch } from './useGuildSearch';

  const garden = useGardenStore();
  const recording = ref<{ thingId?: string; label: string }>();

  const props = defineProps<{
    guildId: string;
    layoutMode?: boolean;
    selectedThingId?: string;
    placingThingId?: string;
  }>();
  const emit = defineEmits<{
    selectPlant: [id: string | undefined];
    placePlant: [id: string];
    openLayout: [];
  }>();

  const { searchQuery } = useGuildSearch();
  const summary = useGuildSummary(toRef(props, 'guildId'));
  const {
    guild,
    groupedGuildPlants,
    guildFunctions,
    guildLayers,
    placedOnMap,
    guildMapSizeLabel,
    guildTooltipRows,
    guildMonthPhenologyCounts,
  } = summary;
  const {
    editingName,
    displayedName,
    plantEditor,
    selectedPick,
    setEditingName,
    commitName,
    openAddPlantEditor,
    openEditPlantEditor,
    isEditingRow,
    closePlantEditor,
    onConfirmPlant,
    mulchStars,
    togglePlantGroup,
    expandedPlantGroupId,
    setThingGrowthPhase,
  } = useGuildEditor(toRef(props, 'guildId'), guild);

  const latestGuildObservation = computed(
    () => guild.value.observations?.toSorted(newestObservationFirst)[0],
  );
  const PLACEMENT_STATUS = {
    editing: 'Editing placement',
    placed: 'Placed',
    unplaced: 'Not placed',
  } as const;

  const plantSort = ref<'name' | 'layer'>('name');
  const groupPlants = ref(false);
  const layerRank = {
    overstory: 0,
    understory: 1,
    vine: 2,
    shrub: 3,
    herb: 4,
    ground_cover: 5,
    root: 6,
  } satisfies Record<GuildLayer, number>;
  const sortedGuildPlants = computed(() => {
    const rows = groupedGuildPlants.value.map((row) => ({
      ...row,
      phenology: phenologySummaryForPlant(
        row.representativeResolved.speciesId,
        row.representativeResolved.cultivarId,
      ),
      singlePlant: row.count === 1 ? row.instances[0] : undefined,
      individuals: row.instances.map((thing) => ({
        thing,
        latest: thing.observations?.toSorted(newestObservationFirst)[0],
        placementStatus:
          props.placingThingId === thing.id
            ? PLACEMENT_STATUS.editing
            : hasPlantPlacement(thing)
              ? PLACEMENT_STATUS.placed
              : PLACEMENT_STATUS.unplaced,
      })),
      layerRank: Math.min(
        ...row.representativeResolved.layers.map((layer) => layerRank[layer]),
        Object.keys(layerRank).length,
      ),
      layerLabels: [...row.representativeResolved.layers]
        .sort((a, b) => layerRank[a] - layerRank[b])
        .map((layer) => guildLayers.value[layer].label),
    }));
    if (plantSort.value === 'layer') {
      rows.sort((a, b) => a.layerRank - b.layerRank);
    }
    return rows;
  });
</script>

<template>
  <article
    class="flex flex-col gap-1 items-start justify-start p-2 text-ink-600 w-full min-w-0 max-w-full h-full min-h-0 max-lg:overflow-y-auto paper-card"
    :class="{ 'paper-card-not-on-aerial': !placedOnMap }"
    :aria-label="guild.name"
  >
    <div class="flex flex-col flex-1 w-full gap-1 lg:min-h-0">
      <div class="flex flex-col gap-1 w-full -ml-2 pl-2 lg:min-h-0 lg:overflow-y-auto">
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
              @click.stop="garden.removeGuildFromAerialMap(guildId)"
            >
              <UiIcon
                name="unmap"
                class="size-4"
              />
            </button>
          </div>
          <div class="ml-auto flex shrink-0 items-center gap-1">
            <button
              :class="{ 'lg:hidden': layoutMode }"
              type="button"
              class="btn-soft inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs disabled:opacity-50"
              :disabled="!placedOnMap"
              :title="
                placedOnMap
                  ? layoutMode
                    ? 'Return to plant layout'
                    : 'Arrange individual plants'
                  : 'Draw the guild on the aerial map first'
              "
              @click="emit('openLayout')"
            >
              <UiIcon name="place" />
              {{ layoutMode ? 'Return to plant layout' : 'Place plants' }}
            </button>
            <button
              type="button"
              class="btn-danger inline-flex items-center gap-1 text-xs rounded-lg px-2 py-0.5"
              aria-label="Delete"
              @click="garden.removeGuild(guildId)"
            >
              <UiIcon name="trash" />
              Delete
            </button>
          </div>
        </div>
        <input
          class="appearance-none bg-transparent border-none focus:outline-hidden text-ink-600 w-full truncate"
          :value="displayedName"
          @focus="editingName = guild.name"
          @input="setEditingName"
          @blur="commitName"
        />
        <slot name="plant-details" />
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
              @click="garden.setGuildMulchLevel(guildId, n)"
              @keydown.enter.prevent="garden.setGuildMulchLevel(guildId, n)"
              @keydown.space.prevent="garden.setGuildMulchLevel(guildId, n)"
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
          <div class="flex flex-wrap items-center gap-2 text-xs text-ink-600">
            <span>Sort by</span>
            <RadioButtonGroup
              v-model="plantSort"
              :name="`guild-plant-sort-${guildId}`"
              label="Sort guild plants by"
              :options="[
                { value: 'name', label: 'Name' },
                { value: 'layer', label: 'Layers' },
              ]"
            />
            <ToggleButton
              v-if="plantSort === 'layer'"
              v-model="groupPlants"
            >
              Group by layer
            </ToggleButton>
          </div>
          <template
            v-for="(row, rowIndex) in sortedGuildPlants"
            :key="row.plantId"
          >
            <h4
              v-if="
                plantSort === 'layer' &&
                groupPlants &&
                (rowIndex === 0 ||
                  row.layerLabels[0] !== sortedGuildPlants[rowIndex - 1]?.layerLabels[0])
              "
              class="mt-2 rounded-md bg-sage-100 px-2 py-1 text-xs font-semibold text-ink-700"
            >
              {{ row.layerLabels[0] || 'No layer assigned' }}
            </h4>
            <div
              v-if="isEditingRow(row)"
              class="flex flex-row items-center gap-1 w-full border-b border-blossom-300 py-1 pl-1"
              aria-label="Edit guild plant"
            >
              <div class="min-w-0 flex-1">
                <PlantCatalogCombobox
                  v-model="selectedPick"
                  autofocus
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
                  :aria-expanded="expandedPlantGroupId === row.plantId"
                  :aria-label="
                    expandedPlantGroupId === row.plantId
                      ? `Collapse ${row.label}`
                      : `Expand ${row.label}`
                  "
                  @click.stop="togglePlantGroup(row.plantId)"
                >
                  <UiIcon
                    name="chevron-down"
                    class="size-4 transition-transform duration-150"
                    :class="{ 'rotate-180': expandedPlantGroupId === row.plantId }"
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
                    v-if="plantSort === 'layer'"
                    class="text-[10px] leading-tight text-ink-500"
                  >
                    {{ row.layerLabels.join(', ') || 'No layer assigned' }}
                  </span>
                  <span
                    v-if="row.phenology"
                    class="text-[10px] leading-tight text-ink-500"
                  >
                    {{ row.phenology }}
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
                    class="hidden size-4 shrink-0 text-ink-400 sm:block"
                    :title="`${row.count - GROUP_HEADER_MAX_PHASE_ICONS} more plants`"
                    aria-label="More plants"
                  />
                  <PlantVigorIcon
                    v-if="row.averageVigor"
                    :vigor="row.averageVigor"
                    class="ml-1"
                  />
                </div>
                <div
                  role="group"
                  :aria-label="`Actions for ${row.label}`"
                  class="flex flex-row items-center gap-0 shrink-0"
                >
                  <button
                    v-if="row.singlePlant"
                    type="button"
                    :title="`Record observation for ${row.label}`"
                    :aria-label="`Record observation for ${row.label}`"
                    class="btn-icon bg-transparent hover:bg-blossom-100 p-0.5 px-1"
                    @click.stop="
                      recording = { thingId: row.singlePlant.id, label: row.label }
                    "
                  >
                    <UiIcon name="document" />
                  </button>
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
                    @click.stop="garden.addPlantToGuild(guildId, row.plantId)"
                  >
                    <UiIcon name="add" />
                  </button>
                </div>
              </div>
              <div class="flex flex-col gap-1 pb-1 pl-7 pr-1">
                <div
                  v-for="({ thing, latest, placementStatus }, index) in row.individuals"
                  v-show="expandedPlantGroupId === row.plantId || latest"
                  :key="thing.id"
                  class="flex flex-col gap-1"
                  :class="{
                    'rounded-lg border border-parchment-300/80 bg-parchment-50/60 px-2 py-1.5':
                      expandedPlantGroupId === row.plantId,
                    'ring-2 ring-sage-600 bg-sage-100':
                      expandedPlantGroupId === row.plantId &&
                      layoutMode &&
                      selectedThingId === thing.id,
                  }"
                  :aria-label="
                    row.count > 1 ? `${row.label} instance ${index + 1}` : row.label
                  "
                >
                  <div
                    v-if="expandedPlantGroupId === row.plantId"
                    class="flex items-center gap-2"
                  >
                    <span
                      v-if="!layoutMode"
                      class="min-w-0 flex-1 truncate text-xs"
                    >
                      {{ row.label
                      }}<template v-if="row.count > 1"> #{{ index + 1 }}</template>
                    </span>
                    <button
                      v-if="layoutMode"
                      type="button"
                      class="min-w-0 flex-1 text-left text-xs hover:underline"
                      :aria-label="`Select ${row.label} #${index + 1}`"
                      :aria-pressed="selectedThingId === thing.id"
                      @click="
                        emit(
                          'selectPlant',
                          selectedThingId === thing.id ? undefined : thing.id,
                        )
                      "
                    >
                      <span class="block truncate"
                        >{{ row.label
                        }}<template v-if="row.count > 1">
                          #{{ index + 1 }}</template
                        ></span
                      >
                    </button>
                    <button
                      v-if="layoutMode"
                      type="button"
                      class="btn-icon shrink-0 p-1 hover:bg-sage-200"
                      :title="placementStatus"
                      :aria-label="`Place ${row.label} #${index + 1} — ${placementStatus}`"
                      @click.stop="emit('placePlant', thing.id)"
                    >
                      <UiIcon
                        name="place"
                        class="size-5"
                        :class="{
                          'text-amber-700': placementStatus === PLACEMENT_STATUS.editing,
                          'text-sage-700': placementStatus === PLACEMENT_STATUS.placed,
                          'text-red-700': placementStatus === PLACEMENT_STATUS.unplaced,
                        }"
                        style="--place-icon-color: currentColor"
                      />
                    </button>
                    <button
                      v-if="row.count > 1"
                      type="button"
                      :title="`Record observation for ${row.label} instance ${index + 1}`"
                      :aria-label="`Record observation for ${row.label} instance ${index + 1}`"
                      class="btn-icon bg-transparent hover:bg-blossom-100 p-0.5 px-1"
                      @click.stop="
                        recording = {
                          thingId: thing.id,
                          label: `${row.label} #${index + 1}`,
                        }
                      "
                    >
                      <UiIcon name="document" />
                    </button>
                    <button
                      type="button"
                      class="btn-icon shrink-0 p-1 hover:bg-red-200"
                      :title="`Remove ${row.label} #${index + 1} from bed`"
                      :aria-label="`Remove ${row.label} #${index + 1} from bed`"
                      @click.stop="garden.removeGuildThings(guildId, [thing.id])"
                    >
                      <UiIcon
                        name="remove-one"
                        class="size-5"
                      />
                    </button>
                  </div>
                  <div
                    v-if="expandedPlantGroupId === row.plantId"
                    class="flex flex-row flex-wrap items-center gap-x-2 gap-y-1"
                  >
                    <label
                      class="flex flex-row items-center gap-1 text-[11px] text-ink-600"
                    >
                      <span class="shrink-0">Phase</span>
                      <select
                        class="min-w-0 max-w-38 rounded-md border border-parchment-400/70 bg-white px-1 py-0.5 text-[11px] text-ink-700"
                        :value="thing.growthPhase ?? ''"
                        @change="
                          setThingGrowthPhase(
                            thing.id,
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
                        :vigor="thing.vigor"
                        @update:vigor="
                          garden.setGuildThingVigor(guildId, thing.id, $event)
                        "
                      />
                    </label>
                  </div>
                  <p
                    v-if="latest"
                    class="whitespace-pre-wrap wrap-break-word text-xs text-ink-600"
                  >
                    <time :datetime="latest.date">{{ latest.date }}</time> ·
                    {{ observationTypeLabels[latest.type] }} · {{ latest.text }}
                  </p>
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
      <GuildSeasonStrip
        :harvest="guildMonthPhenologyCounts.harvest"
        :blooming="guildMonthPhenologyCounts.blooming"
        :tooltip-rows="guildTooltipRows"
      />
      <div class="flex flex-col w-full items-start gap-1 pt-1">
        <GuildCardSectionLabel>Observations</GuildCardSectionLabel>
        <button
          type="button"
          class="btn-soft px-2 py-1 text-sm"
          @click="recording = { label: guild.name }"
        >
          Record observation
        </button>
        <p
          v-if="latestGuildObservation"
          class="whitespace-pre-wrap wrap-break-word text-sm"
        >
          <time :datetime="latestGuildObservation.date">{{
            latestGuildObservation.date
          }}</time>
          · {{ observationTypeLabels[latestGuildObservation.type] }} ·
          {{ latestGuildObservation.text }}
        </p>
      </div>
      <ObservationDialog
        v-if="recording"
        :key="guildId"
        :label="recording.label"
        :guild-id="guildId"
        :thing-id="recording.thingId"
        :observations="
          recording.thingId
            ? guild.plants.find((p) => p.id === recording?.thingId)?.observations
            : guild.observations
        "
        @close="recording = undefined"
      />
    </div>
  </article>
</template>
