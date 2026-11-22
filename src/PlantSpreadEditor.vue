<script setup lang="ts">
  import { computed } from 'vue';
  import type { GardenThing } from './gardenTypes';
  import { getSpecies } from './plantCatalog';
  import { useGardenStore } from './useGardenStore';
  import { useFutureView } from './useFutureView';

  const props = defineProps<{ guildId: string; thing: Readonly<GardenThing> }>();
  const garden = useGardenStore();
  const future = useFutureView();
  const profile = computed(() => future.profiles.get(props.thing.plantId));
  const species = computed(() =>
    getSpecies(garden.resolvedPlant(props.thing.plantId).speciesId),
  );
  const changeSpread = (event: Event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    if (!input.validity.valid) {
      input.reportValidity();
      input.value = props.thing.matureSpreadM?.toString() ?? '';
      return;
    }
    garden.setMatureSpread(
      props.guildId,
      props.thing.id,
      input.value ? Number(input.value) : undefined,
    );
  };
</script>

<template>
  <div class="paper-inset my-1 p-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
    <strong>{{ thing.nameOrCultivar }}</strong>
    <a
      v-if="profile"
      class="link-soft"
      :href="profile.source"
      target="_blank"
      rel="noopener noreferrer"
    >
      Catalog spread · {{ profile.spreadM }} m
    </a>
    <a
      v-if="profile?.maturityYears"
      class="link-soft"
      :href="profile.timingSource ?? profile.source"
      target="_blank"
      rel="noopener noreferrer"
      >Estimated maturity · {{ profile.maturityYears }} years</a
    >
    <span v-else-if="profile && future.horizon !== 'final'"
      >Mature width appears in Final.</span
    >
    <span v-if="!profile">No catalog width</span>
    <label class="inline-flex items-center gap-1"
      >Mature width (m)
      <input
        type="number"
        class="input-soft w-20 px-2 py-1"
        min="0.001"
        step="any"
        :placeholder="profile?.spreadM.toString()"
        :value="thing.matureSpreadM ?? ''"
        @change="changeSpread"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
      />
    </label>
    <template v-if="species?.rootstockSpreadsM">
      <label class="inline-flex items-center gap-1"
        >Rootstock width
        <select
          class="input-soft px-1 py-1"
          :value="thing.matureSpreadM ?? ''"
          @change="changeSpread"
        >
          <option value="">Catalog default</option>
          <option
            v-if="
              thing.matureSpreadM &&
              !Object.values(species.rootstockSpreadsM).includes(thing.matureSpreadM)
            "
            :value="thing.matureSpreadM"
          >
            Custom
          </option>
          <option
            v-for="(width, stock) in species.rootstockSpreadsM"
            :key="stock"
            :value="width"
          >
            {{ stock }} · {{ width }} m
          </option>
        </select></label
      >
      <a
        class="link-soft"
        href="https://www.rhs.org.uk/fruit/fruit-trees/rootstocks"
        target="_blank"
        rel="noopener noreferrer"
        >Rootstock widths</a
      >
    </template>
  </div>
</template>
