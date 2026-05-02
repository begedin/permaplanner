<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import type { MulchLevel, UserPlant } from './gardenTypes';
import { GuildFunction, GuildLayer, useGardenStore } from './useGardenStore';
import { plantCatalog } from './plantCatalog';
import PlantIcon from './PlantIcon.vue';
import { uuid } from './utils';

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

const removePlant = (index: number) => guild.value?.plants.splice(index, 1);

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
</script>

<template>
  <article
    v-if="guild"
    class="flex flex-col gap-1 items-start justify-start p-2 rounded text-slate-600 bg-white border border-slate-200 shadow-sm hover:border-emerald-200 transition-colors w-full"
    :class="{
      'ring-2 ring-emerald-500 ring-offset-1':
        context === 'aerialSidebar' && garden.selectedId === guildId,
    }"
    :aria-label="guild.name"
  >
    <div
      v-if="context === 'aerialSidebar'"
      class="w-full shrink-0"
    >
      <button
        type="button"
        class="w-full text-xs bg-emerald-100 hover:bg-emerald-200 rounded py-1.5 px-2 text-slate-800 font-medium"
        @click="garden.selectGuild(guildId)"
      >
        {{
          garden.selectedId === guildId
            ? 'Selected on aerial map'
            : 'Select on aerial map'
        }}
      </button>
    </div>
    <div class="flex flex-row items-center justify-between gap-2 w-full flex-wrap">
      <p
        v-if="!placedOnMap"
        class="text-xs text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded"
      >
        Not on aerial
      </p>
      <button
        type="button"
        :class="placedOnMap ? '' : 'ml-auto'"
        class="text-xs bg-red-100 hover:bg-red-200 text-red-900 rounded px-2 py-0.5"
        @click="removeGuild"
      >
        Remove guild
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
      <h3 class="w-full text-left bg-sky-200 -mx-2 px-2">
        Plants
      </h3>
      <div
        v-for="(plant, index) in guild.plants"
        :key="plant.id"
        :aria-label="plant.nameOrCultivar"
        class="pl-1 flex flex-row items-center justify-start w-full gap-1 border-b border-sky-300"
      >
        <PlantIcon
          :title="plant.nameOrCultivar"
          class="h-4 w-4"
          :plant="garden.resolvedPlant(plant.plantId)"
        />
        <span class="truncate text-left flex-grow">{{ plant.nameOrCultivar }}</span>
        <button
          type="button"
          title="Remove plant from bed"
          aria-label="Remove plant from bed"
          class="bg-transparent hover:bg-red-200 rounded-md p-1/2 px-1 transition-colors"
          @click="removePlant(index)"
        >
          ✖️
        </button>
      </div>
    </div>
    <div class="flex flex-row flex-wrap gap-1 w-full">
      <h3 class="w-full text-left bg-sky-200 -mx-2 px-2">
        Functions
      </h3>
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
      <h3 class="w-full text-left bg-sky-200 -mx-2 px-1">
        Layers
      </h3>
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
  </article>
</template>
