<script lang="ts" setup>
  import { toRef } from 'vue';

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
  import GuildPlantQuantityRemoveButton from './GuildPlantQuantityRemoveButton.vue';
  import GuildSeasonStrip from './GuildSeasonStrip.vue';
  import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
  import PlantIcon from './PlantIcon.vue';
  import PlantVigorIcon from './PlantVigorIcon.vue';
  import PlantVigorRating from './PlantVigorRating.vue';
  import UiIcon from './uiIcons/UiIcon.vue';
  import { useGuildCardModel } from './useGuildCardModel';
  import { useGuildSearch } from './useGuildSearch';

  const props = defineProps<{
    guildId: string;
  }>();

  const { searchQuery } = useGuildSearch();
  const {
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
    togglePlantGroup,
    isPlantGroupExpanded,
    guildThing,
    setThingGrowthPhase,
    setThingVigorLevel,
  } = useGuildCardModel(toRef(props, 'guildId'));
</script>

<template>
  <article
    class="flex flex-col gap-1 items-start justify-start p-2 text-ink-600 w-full min-w-0 max-w-full h-full min-h-0 paper-card"
    :class="{ 'paper-card-not-on-aerial': !placedOnMap }"
    :aria-label="guild.name"
  >
    <div class="flex flex-col flex-1 min-h-0 w-full gap-1">
      <div class="flex flex-col gap-1 w-full min-h-0 overflow-y-auto shrink -ml-2 pl-2">
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
          :value="displayedName"
          @focus="editingName = guild.name"
          @input="setEditingName"
          @blur="commitName"
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
      <GuildSeasonStrip
        :fruiting="guildMonthPhenologyCounts.fruiting"
        :blooming="guildMonthPhenologyCounts.blooming"
        :tooltip-rows="guildTooltipRows"
      />
      <div class="flex flex-col flex-1 min-h-0 w-full gap-1 pt-1">
        <GuildCardSectionLabel>Note</GuildCardSectionLabel>
        <textarea
          class="input-soft w-full flex-1 min-h-0 resize-none p-2 text-sm text-ink-800 leading-relaxed"
          :value="displayedNote"
          aria-label="Guild note"
          placeholder="Notes for this guild…"
          @focus="editingNote = guild.note ?? ''"
          @input="setEditingNote"
          @blur="commitNote"
          @keydown="onNoteKeydown"
        />
      </div>
    </div>
  </article>
</template>
