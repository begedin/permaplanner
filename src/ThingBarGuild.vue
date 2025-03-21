<script lang="ts" setup>
import { computed } from 'vue';

import { GuildFunction, GuildLayer, useGardenStore } from './useGardenStore';
import PlantIcon from './PlantIcon.vue';

const garden = useGardenStore();

const props = defineProps<{
  id: string;
}>();

const guild = computed(() => garden.guilds.find((guild) => guild.id === props.id));

const setName = (e: Event) => {
  if (!guild.value) {
    return;
  }
  guild.value.name = (e.target as HTMLInputElement)?.value || '';
};

const removePlant = (index: number) => guild.value?.plants.splice(index, 1);

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
    const plant = garden.plantsById[thing.plantId] || garden.plantsById.default;
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
    const plant = garden.plantsById[thing.plantId] || garden.plantsById.default;
    plant.layers.forEach((l) => {
      layersByName[l].count++;
    });
  });

  return layersByName;
});
</script>

<template>
  <button
    v-if="guild"
    class="flex flex-col gap-1 items-start justify-start hover:bg-emerald-300 transition-colors p-2 rounded text-slate-600"
    :aria-label="guild.name"
    :class="{
      'bg-emerald-100': garden.selectedId === id,
      'border-emerald-200': garden.selectedId !== id,
    }"
    @click.exact="garden.selectGuild(id)"
    @click.shift="garden.deleteFeature(id)"
    @mouseenter="garden.hoveredId = id"
    @mouseleave="garden.hoveredId = undefined"
  >
    <input
      class="appearance-none bg-transparent border-none focus:outline-none text-slate-600 w-full truncate"
      :value="guild.name"
      @input="setName"
    />
    <div
      class="flex flex-col gap-1 w-full"
      aria-label="Plants in this guild"
    >
      <h3 class="w-full text-left bg-sky-200 -mx-2 px-2">Plants</h3>
      <div
        v-for="(plant, index) in guild.plants"
        :key="plant.id"
        :aria-label="plant.nameOrCultivar"
        class="pl-1 flex flex-row items-center justify-start w-full gap-1 border-b border-sky-300"
      >
        <PlantIcon
          :title="plant.nameOrCultivar"
          class="h-4 w-4"
          :plant="garden.plantsById[plant.plantId] || garden.plantsById.default"
        />

        <span class="truncate text-left flex-grow">{{ plant.nameOrCultivar }}</span>

        <button
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
      <h3 class="w-full text-left bg-sky-200 -mx-2 px-2">Functions</h3>
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
      <h3 class="w-full text-left bg-sky-200 -mx-2 px-1">Layers</h3>
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
  </button>
</template>
