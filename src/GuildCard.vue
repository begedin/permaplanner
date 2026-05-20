<script lang="ts" setup>
import { computed, ref } from 'vue';

import type { CatalogPlantPick } from './catalogPlantPick';
import type { Guild, MulchLevel, Plant, UserPlant } from './gardenTypes';
import type { GuildFunction, GuildLayer } from './useGardenStore';
import { formatGuildMapDimensions, pathBounds } from './guildPathBounds';
import { useGardenStore } from './useGardenStore';
import { useGuildSelection } from './useGuildSelection';
import { useMapScaleStore } from './useMapScaleStore';
import {
  CATALOG_MONTH_LABELS,
  CATALOG_MONTH_LABELS_2,
  fruitBloomMonthCountsForPhenologies,
  phenologySummaryForPlant,
  resolvePhenology,
} from './plantCatalog';
import GuildCardSectionLabel from './GuildCardSectionLabel.vue';
import PlantCatalogCombobox from './PlantCatalogCombobox.vue';
import PlantIcon from './PlantIcon.vue';
import {
  functionLabelTooltip,
  guildPlantTooltipRows,
  layerLabelTooltip,
  monthAspectTooltip,
  monthHeaderTooltip,
} from './guildPlantTooltips';
import { plantGuildGroupLabel } from './resolvePlant';
import { uuid } from './utils';

type GuildPlantGroupRow = {
  plantId: string;
  label: string;
  count: number;
  thingIds: string[];
  representativeResolved: Plant;
};

const garden = useGardenStore();
const mapScale = useMapScaleStore();
const { selectedGuildId, selectGuild } = useGuildSelection();

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

const selectedPick = ref<CatalogPlantPick | null>(null);

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

const removeOneGuildThing = (thingIds: string[]) => {
  if (thingIds.length <= 1) {
    return;
  }
  removeGuildThingsByIds([thingIds[thingIds.length - 1]!]);
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
  const rows: GuildPlantGroupRow[] = [...byPlantId.values()].map(({ thingIds, rp }) => ({
    plantId: rp.id,
    label: plantGuildGroupLabel(rp),
    count: thingIds.length,
    thingIds,
    representativeResolved: rp,
  }));
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

const onAddPlant = () => {
  if (!selectedPick.value) {
    return;
  }
  const { speciesId, cultivarId } = selectedPick.value;
  let up = findMatchingUserPlant();
  if (!up) {
    up = { id: uuid(), speciesId, cultivarId };
    garden.plants.push(up);
  }
  garden.addPlantToGuild(guild.value.id, up.id);
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
    'bg-slate-200',
    'bg-emerald-100',
    'bg-emerald-200',
    'bg-emerald-300',
    'bg-emerald-400',
    'bg-emerald-500',
  ];
  return classes[n] ?? classes[0]!;
};

const compactPlantTags = computed(() =>
  groupedGuildPlants.value.map((row) => ({
    text: row.count > 1 ? `${row.label} ×${row.count}` : row.label,
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
</script>

<template>
  <article
    class="flex flex-col gap-1 items-start justify-start p-2 rounded text-slate-600 bg-white border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors w-full"
    :class="{
      'h-full': context === 'aerialSidebar' && fillCell,
      'ring-2 ring-emerald-500 ring-offset-1':
        context === 'aerialSidebar' && selectedGuildId === guildId,
      'cursor-pointer': context === 'aerialSidebar',
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
        <p class="font-medium text-slate-800 min-w-0 flex-1">
          {{ guild.name }}
        </p>
        <div
          v-if="placedOnMap"
          class="flex flex-row items-center gap-1 shrink-0"
        >
          <span
            v-if="guildMapSizeLabel"
            class="text-[11px] leading-tight text-slate-500 tabular-nums"
            aria-label="Guild size on aerial map"
          >
            {{ guildMapSizeLabel }}
          </span>
          <button
            type="button"
            title="Remove from aerial map"
            aria-label="Remove from aerial map"
            class="bg-transparent hover:bg-amber-100 rounded-md p-0.5 px-1 text-sm leading-none transition-colors"
            @click.stop="removeFromAerialMap"
          >
            ⊖
          </button>
        </div>
      </div>
      <div
        class="flex flex-wrap gap-1 w-full"
        aria-label="Plants in this guild"
      >
        <span
          v-for="(tag, i) in compactPlantTags"
          :key="`${tag.text}-${i}`"
          class="text-[11px] leading-tight text-slate-700 bg-slate-100 border border-slate-200/80 rounded px-1.5 py-0.5"
          >{{ tag.text }}</span
        >
        <span
          v-if="compactPlantTags.length === 0"
          class="text-xs text-slate-400 italic"
          >No plants</span
        >
      </div>
    </template>

    <template v-if="context === 'guilds'">
      <div class="flex flex-row items-center justify-between gap-2 w-full flex-wrap">
        <p
          v-if="!placedOnMap"
          class="text-xs text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded"
        >
          Not on aerial
        </p>
        <div
          v-if="placedOnMap"
          class="flex flex-row items-center gap-1.5"
        >
          <span
            v-if="guildMapSizeLabel"
            class="text-xs text-slate-600 tabular-nums"
            aria-label="Guild size on aerial map"
          >
            {{ guildMapSizeLabel }}
          </span>
          <button
            type="button"
            title="Remove from aerial map"
            aria-label="Remove from aerial map"
            class="bg-transparent hover:bg-amber-100 rounded-md p-0.5 px-1 text-sm leading-none transition-colors"
            @click.stop="removeFromAerialMap"
          >
            ⊖
          </button>
        </div>
        <button
          type="button"
          :class="placedOnMap ? '' : 'ml-auto'"
          class="inline-flex items-center gap-1 text-xs bg-red-100 hover:bg-red-200 text-red-900 rounded px-2 py-0.5"
          aria-label="Delete"
          @click="removeGuild"
        >
          <span
            class="leading-none"
            aria-hidden="true"
            >🗑️</span
          >
          Delete
        </button>
      </div>
      <input
        class="appearance-none bg-transparent border-none focus:outline-none text-slate-600 w-full truncate"
        :value="guild.name"
        @input="setName"
      />
      <div
        role="radiogroup"
        aria-label="Mulch level"
        class="flex flex-row items-center gap-1.5 w-full"
      >
        <span class="text-xs text-slate-500 shrink-0">Mulch</span>
        <div class="flex flex-row gap-0.5 items-center">
          <span
            v-for="n in mulchStars"
            :key="n"
            role="radio"
            :aria-checked="guild.mulchLevel === n"
            tabindex="0"
            class="cursor-pointer text-base leading-none select-none rounded px-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400/80 focus:ring-offset-1"
            :class="n <= guild.mulchLevel ? 'text-amber-500' : 'text-slate-300'"
            :aria-label="`Mulch level ${n} of 5`"
            @click="setMulchLevel(n)"
            @keydown.enter.prevent="setMulchLevel(n)"
            @keydown.space.prevent="setMulchLevel(n)"
          >
            ★
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
            :aria-label="row.count > 1 ? `${row.label} (${row.count})` : row.label"
            class="pl-1 flex flex-row items-start justify-start w-full gap-1 border-b border-sky-300 py-0.5"
          >
            <PlantIcon
              :title="row.label"
              class="h-4 w-4 shrink-0 mt-0.5"
              :plant="row.representativeResolved"
            />
            <div class="min-w-0 flex-1 flex flex-col gap-0 text-left">
              <span class="truncate text-sm leading-tight">
                {{ row.label
                }}<template v-if="row.count > 1"> ({{ row.count }}) </template>
              </span>
              <span
                v-if="phenologySummaryForThingIds(row.thingIds)"
                class="text-[10px] leading-tight text-slate-500"
              >
                {{ phenologySummaryForThingIds(row.thingIds) }}
              </span>
            </div>
            <div class="flex flex-row items-start gap-0 shrink-0">
              <button
                v-if="row.count > 1"
                type="button"
                title="Remove one plant from bed"
                aria-label="Remove one plant from bed"
                class="bg-transparent hover:bg-amber-100 rounded-md p-1/2 px-1 transition-colors"
                @click="removeOneGuildThing(row.thingIds)"
              >
                ➖
              </button>
              <button
                type="button"
                title="Remove plant from bed"
                aria-label="Remove plant from bed"
                class="bg-transparent hover:bg-red-200 rounded-md p-1/2 px-1 transition-colors"
                @click="removeGuildThingsByIds(row.thingIds)"
              >
                ✖️
              </button>
            </div>
          </div>
        </template>
      </div>
      <div class="flex flex-row flex-wrap gap-1 w-full">
        <GuildCardSectionLabel>Functions</GuildCardSectionLabel>
        <div
          v-for="(f, fnKey) in guildFunctions"
          :key="fnKey"
          :class="{
            'bg-red-200': f.count == 0,
            'bg-green-200': f.count == 1,
            'bg-green-500': f.count > 1,
          }"
          class="rounded-md p-1/2 px-1 text-xs"
          :aria-label="`${f.label}`"
          :title="functionLabelTooltip(guildTooltipRows, fnKey, f.label)"
        >
          {{ f.label }}
          <span
            v-if="f.count > 1"
            class="text-slate-500 bg-slate-200 rounded-md px-1 text-xs"
          >
            {{ f.count }}
          </span>
        </div>
      </div>
      <div class="flex flex-row flex-wrap gap-1 w-full">
        <GuildCardSectionLabel>Layers</GuildCardSectionLabel>
        <div
          v-for="(l, layerKey) in guildLayers"
          :key="layerKey"
          :class="{
            'bg-red-200': l.count == 0,
            'bg-green-200': l.count == 1,
            'bg-green-500': l.count > 1,
          }"
          class="rounded-md p-1/2 px-1 text-xs"
          :aria-label="`${l.label}`"
          :title="layerLabelTooltip(guildTooltipRows, layerKey, l.label)"
        >
          {{ l.label }}
          <span
            v-if="l.count > 1"
            class="text-xs text-slate-500 bg-slate-200 rounded-md px-1"
          >
            {{ l.count }}
          </span>
        </div>
      </div>
    </template>

    <div
      class="flex flex-col gap-1 w-full"
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
            class="flex-1 min-w-0 text-center text-[10px] leading-none font-medium text-slate-500"
            :title="monthHeaderTooltip(guildTooltipRows, i, CATALOG_MONTH_LABELS[i])"
            >{{ lab }}</span
          >
        </div>
      </div>
      <div
        class="flex flex-row items-center gap-1 w-full"
        role="group"
        aria-label="Fruiting by month"
      >
        <span class="text-[10px] text-slate-500 w-9 shrink-0">Fruit</span>
        <div
          class="flex flex-row gap-0.5 flex-1 min-w-0"
          role="list"
        >
          <div
            v-for="(count, i) in guildMonthPhenologyCounts.fruiting"
            :key="`f-${i}`"
            role="listitem"
            class="flex-1 min-w-0 rounded-sm h-3 border border-slate-200/80"
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
        <span class="text-[10px] text-slate-500 w-9 shrink-0">Bloom</span>
        <div
          class="flex flex-row gap-0.5 flex-1 min-w-0"
          role="list"
        >
          <div
            v-for="(count, i) in guildMonthPhenologyCounts.blooming"
            :key="`b-${i}`"
            role="listitem"
            class="flex-1 min-w-0 rounded-sm h-3 border border-slate-200/80"
            :class="guildMonthBlockClass(count)"
            :title="
              monthAspectTooltip(guildTooltipRows, i, 'blooming', CATALOG_MONTH_LABELS[i])
            "
          />
        </div>
      </div>
    </div>
    <div
      v-if="context === 'guilds'"
      class="flex flex-col gap-2 w-full"
    >
      <GuildCardSectionLabel>Add plant</GuildCardSectionLabel>
      <PlantCatalogCombobox v-model="selectedPick" />
      <button
        type="button"
        class="w-full text-sm bg-green-200 hover:bg-green-300 disabled:opacity-50 rounded py-1 px-2 text-slate-800"
        :disabled="!selectedPick"
        @click="onAddPlant"
      >
        Add to guild
      </button>
    </div>
  </article>
</template>
