<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { MulchLevel, Plant, UserPlant } from './gardenTypes';
import { GuildFunction, GuildLayer, useGardenStore } from './useGardenStore';
import {
  CATALOG_MONTH_LABELS,
  CATALOG_MONTH_LABELS_2,
  fruitBloomMonthCountsForPhenologies,
  phenologySummaryForPlant,
  plantCatalog,
  resolvePhenology,
} from './plantCatalog';
import GuildCardSectionLabel from './GuildCardSectionLabel.vue';
import PlantIcon from './PlantIcon.vue';
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

const props = withDefaults(
  defineProps<{
    guildId: string;
    /** Aerial sidebar: map selection control + ring when selected. Guilds tab: omit extras. */
    context?: 'aerialSidebar' | 'guilds';
  }>(),
  { context: 'guilds' },
);

const guild = computed(() => garden.guilds.find((g) => g.id === props.guildId));

const catalogSpecies = computed(() => plantCatalog.species.filter((s) => s.id !== 'unknown'));

const addSpeciesId = ref('');
const addCultivarId = ref('');

watch(
  catalogSpecies,
  (list) => {
    if (list.length && !addSpeciesId.value) {
      addSpeciesId.value = list[0]!.id;
    }
  },
  { immediate: true },
);

const cultivarOptions = computed(() => {
  const s = plantCatalog.species.find((x) => x.id === addSpeciesId.value);
  return s?.cultivars ?? [];
});

watch(addSpeciesId, () => {
  addCultivarId.value = '';
});

const findMatchingUserPlant = (): UserPlant | undefined => {
  const speciesId = addSpeciesId.value;
  if (!speciesId) {
    return undefined;
  }
  const cultivarId = addCultivarId.value === '' ? null : addCultivarId.value;
  return garden.plants.find(
    (p) => p.speciesId === speciesId && (p.cultivarId ?? null) === (cultivarId ?? null),
  );
};

const setName = (e: Event) => {
  if (!guild.value) {
    return;
  }
  guild.value.name = (e.target as HTMLInputElement)?.value || '';
};

const removeGuildThingsByIds = (thingIds: string[]) => {
  const g = guild.value;
  if (!g || thingIds.length === 0) {
    return;
  }
  const idSet = new Set(thingIds);
  for (let i = g.plants.length - 1; i >= 0; i--) {
    if (idSet.has(g.plants[i]!.id)) {
      g.plants.splice(i, 1);
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
  const g = guild.value;
  if (!g) {
    return [];
  }
  const byPlantId = new Map<string, { thingIds: string[]; rp: Plant }>();
  for (const thing of g.plants) {
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
    const byName = a.representativeResolved.name.localeCompare(b.representativeResolved.name);
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
  if (!guild.value || !addSpeciesId.value) {
    return;
  }
  const cultivarId = addCultivarId.value === '' ? null : addCultivarId.value;
  let up = findMatchingUserPlant();
  if (!up) {
    up = { id: uuid(), speciesId: addSpeciesId.value, cultivarId };
    garden.plants.push(up);
  }
  garden.addPlantToGuild(guild.value.id, up.id);
};

const removeGuild = () => {
  if (!guild.value) {
    return;
  }
  garden.removeGuild(guild.value.id);
};

const removeFromAerialMap = () => {
  if (!guild.value) {
    return;
  }
  garden.removeGuildFromAerialMap(guild.value.id);
};

const guildFunctions = computed(() => {
  const functionsByName = Object.fromEntries(
    Object.values(GuildFunction).map((f) => [
      f,
      {
        label: f.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        count: 0,
      },
    ]),
  );

  guild.value?.plants.forEach((thing) => {
    const plant = garden.resolvedPlant(thing.plantId);
    plant.functions.forEach((f) => {
      functionsByName[f].count++;
    });
  });

  return functionsByName;
});

const guildLayers = computed(() => {
  const layersByName = Object.fromEntries(
    Object.values(GuildLayer).map((l) => [
      l,
      {
        label: l.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        count: 0,
      },
    ]),
  );

  guild.value?.plants.forEach((thing) => {
    const plant = garden.resolvedPlant(thing.plantId);
    plant.layers.forEach((layer) => {
      layersByName[layer].count++;
    });
  });

  return layersByName;
});

const placedOnMap = computed(() => (guild.value ? guild.value.path.length > 0 : false));

const mulchStars: MulchLevel[] = [1, 2, 3, 4, 5];

const setMulchLevel = (level: MulchLevel) => {
  if (!guild.value) {
    return;
  }
  guild.value.mulchLevel = level;
};

const phenologySummaryForThingIds = (thingIds: string[]): string | null => {
  if (!guild.value || thingIds.length === 0) {
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

const guildMonthPhenologyCounts = computed(() => {
  const g = guild.value;
  if (!g) {
    return {
      fruiting: Array.from({ length: 12 }, () => 0),
      blooming: Array.from({ length: 12 }, () => 0),
    };
  }
  const phenologies = g.plants.map((thing) => {
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
    garden.selectGuild(props.guildId);
  }
};

const onAerialListKeydown = (e: KeyboardEvent) => {
  if (props.context !== 'aerialSidebar') {
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    garden.selectGuild(props.guildId);
  }
};
</script>

<template>
  <article
    v-if="guild"
    class="flex flex-col gap-1 items-start justify-start p-2 rounded text-slate-600 bg-white border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors w-full"
    :class="{
      'ring-2 ring-emerald-500 ring-offset-1':
        context === 'aerialSidebar' && garden.selectedId === guildId,
      'cursor-pointer': context === 'aerialSidebar',
    }"
    :aria-label="guild.name"
    :aria-current="context === 'aerialSidebar' && garden.selectedId === guildId ? 'true' : undefined"
    :tabindex="context === 'aerialSidebar' ? 0 : undefined"
    @click="onAerialListClick"
    @keydown="onAerialListKeydown"
  >
    <template v-if="context === 'aerialSidebar'">
      <p class="font-medium text-slate-800 w-full">
        {{ guild.name }}
      </p>
      <div
        class="flex flex-wrap gap-1 w-full"
        aria-label="Plants in this guild"
      >
        <span
          v-for="(tag, i) in compactPlantTags"
          :key="`${tag.text}-${i}`"
          class="text-[11px] leading-tight text-slate-700 bg-slate-100 border border-slate-200/80 rounded px-1.5 py-0.5"
        >{{ tag.text }}</span>
        <span
          v-if="compactPlantTags.length === 0"
          class="text-xs text-slate-400 italic"
        >No plants</span>
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
      <button
        v-if="placedOnMap"
        type="button"
        class="text-xs bg-amber-100 hover:bg-amber-200 text-amber-950 rounded px-2 py-0.5"
        @click="removeFromAerialMap"
      >
        Remove from aerial map
      </button>
      <button
        type="button"
        :class="placedOnMap ? '' : 'ml-auto'"
        class="text-xs bg-red-100 hover:bg-red-200 text-red-900 rounded px-2 py-0.5"
        @click="removeGuild"
      >
        Delete guild
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
    <div class="flex flex-col gap-2 w-full">
      <span class="text-xs font-medium text-slate-700">Add plant</span>
      <label class="flex flex-col gap-0.5 text-xs text-slate-600">
        <span>Species</span>
        <select
          v-model="addSpeciesId"
          class="w-full p-1 border border-slate-300 rounded text-sm bg-white"
        >
          <option
            v-for="s in catalogSpecies"
            :key="s.id"
            :value="s.id"
          >
            {{ s.name }}
          </option>
        </select>
      </label>
      <label
        v-if="cultivarOptions.length > 0"
        class="flex flex-col gap-0.5 text-xs text-slate-600"
      >
        <span>Cultivar</span>
        <select
          v-model="addCultivarId"
          class="w-full p-1 border border-slate-300 rounded text-sm bg-white"
        >
          <option value="">
            (species default)
          </option>
          <option
            v-for="c in cultivarOptions"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
      </label>
      <button
        type="button"
        class="w-full text-sm bg-green-200 hover:bg-green-300 disabled:opacity-50 rounded py-1 px-2 text-slate-800"
        :disabled="!addSpeciesId"
        @click="onAddPlant"
      >
        Add to guild
      </button>
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
              }}<template v-if="row.count > 1">
                ({{ row.count }})
              </template>
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
        v-for="(f, i) in guildFunctions"
        :key="i"
        :class="{
          'bg-red-200': f.count == 0,
          'bg-green-200': f.count == 1,
          'bg-green-500': f.count > 1,
        }"
        class="rounded-md p-1/2 px-1 text-xs"
        :aria-label="`${f.label}`"
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
        v-for="(l, i) in guildLayers"
        :key="i"
        :class="{
          'bg-red-200': l.count == 0,
          'bg-green-200': l.count == 1,
          'bg-green-500': l.count > 1,
        }"
        class="rounded-md p-1/2 px-1 text-xs"
        :aria-label="`${l.label}`"
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
          >{{ lab }}</span>
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
            :title="`${CATALOG_MONTH_LABELS[i]} fruit: ${count} plant${count === 1 ? '' : 's'}`"
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
            :title="`${CATALOG_MONTH_LABELS[i]} bloom: ${count} plant${count === 1 ? '' : 's'}`"
          />
        </div>
      </div>
    </div>
  </article>
</template>
