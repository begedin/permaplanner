<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useInfiniteScroll } from '@vueuse/core';
  import UiIcon from './uiIcons/UiIcon.vue';
  import ObservationDialog from './ObservationDialog.vue';
  import {
    newestObservationFirst,
    observationTypeLabels,
    type Observation,
    type ObservationLocation,
  } from './observations';
  import { useGardenStore } from './useGardenStore';

  const garden = useGardenStore();
  const editing = ref<{ location: ObservationLocation; entry?: Observation }>();
  const scrollArea = ref<HTMLElement>();
  const pageSize = 30;
  const limit = ref(pageSize);
  const locations = computed(() => {
    const rows: [ObservationLocation, ...ObservationLocation[]] = [
      { label: 'Whole garden', observations: garden.observations },
    ];
    for (const guild of garden.guilds) {
      rows.push({
        guildId: guild.id,
        label: guild.name,
        observations: guild.observations,
      });
      const counts = new Map<string, number>();
      for (const plant of guild.plants) {
        const number = (counts.get(plant.plantId) ?? 0) + 1;
        counts.set(plant.plantId, number);
        rows.push({
          guildId: guild.id,
          thingId: plant.id,
          label: `${plant.nameOrCultivar} #${number} · ${guild.name}`,
          observations: plant.observations,
        });
      }
    }
    return rows;
  });
  const entries = computed(() =>
    locations.value
      .flatMap((location) =>
        (location.observations ?? []).map((entry) => ({ location, entry })),
      )
      .sort((a, b) => newestObservationFirst(a.entry, b.entry)),
  );
  useInfiniteScroll(
    scrollArea,
    () => {
      limit.value += pageSize;
    },
    { distance: 120, canLoadMore: () => limit.value < entries.value.length },
  );
</script>

<template>
  <section
    class="flex min-h-0 flex-1 flex-col"
    aria-label="Observations"
  >
    <div class="flex items-center justify-between gap-2 px-4 py-2">
      <h2 class="font-medium text-ink-800">Observations</h2>
      <button
        class="btn-soft px-3 py-1.5 text-sm"
        @click="editing = { location: locations[0] }"
      >
        Record observation
      </button>
    </div>
    <div
      ref="scrollArea"
      tabindex="0"
      aria-label="Observation history"
      class="min-h-0 flex-1 overflow-y-auto px-4"
    >
      <p
        v-if="!entries.length"
        class="text-sm text-ink-600"
      >
        No observations yet.
      </p>
      <ol class="divide-y divide-parchment-300">
        <li
          v-for="{ location, entry } in entries.slice(0, limit)"
          :key="entry.id"
          class="py-3"
        >
          <div class="flex flex-wrap items-baseline gap-x-3 text-sm">
            <strong class="font-medium text-ink-800">{{ location.label }}</strong>
            <span class="text-xs font-medium text-sage-800">{{
              observationTypeLabels[entry.type]
            }}</span>
            <time
              :datetime="entry.date"
              class="text-ink-500"
              >{{ entry.date }}</time
            >
            <button
              type="button"
              :aria-label="`Edit observation for ${location.label} on ${entry.date}`"
              class="ml-auto btn-icon p-1"
              @click="editing = { location, entry }"
            >
              <UiIcon
                name="edit"
                class="size-4"
              />
            </button>
          </div>
          <p class="whitespace-pre-wrap wrap-break-word text-sm text-ink-700">
            {{ entry.text }}
          </p>
        </li>
      </ol>
      <button
        v-if="limit < entries.length"
        type="button"
        class="btn-soft my-2 px-3 py-1 text-sm"
        @click="limit += pageSize"
      >
        Show older observations
      </button>
    </div>
    <ObservationDialog
      v-if="editing"
      v-bind="editing"
      :locations="editing.entry ? undefined : locations"
      @close="editing = undefined"
    />
  </section>
</template>
