<script lang="ts" setup>
import { computed } from 'vue';

import {
  CATALOG_MONTH_LABELS,
  CATALOG_MONTH_LABELS_2,
  fruitBloomMonthCountsForPhenologies,
  resolvePhenology,
} from './plantCatalog';
import {
  guildPlantTooltipRows,
  monthAspectTooltip,
  monthHeaderTooltip,
} from './guildPlantTooltips';
import { useGardenStore } from './useGardenStore';

const garden = useGardenStore();

const gardenTooltipRows = computed(() =>
  guildPlantTooltipRows(
    garden.guilds.flatMap((guild) => guild.plants.map((thing) => thing.plantId)),
    (plantId) => garden.resolvedPlant(plantId),
  ),
);

const gardenMonthPhenologyCounts = computed(() => {
  const phenologies = garden.guilds.flatMap((guild) =>
    guild.plants.map((thing) => {
      const rp = garden.resolvedPlant(thing.plantId);
      return resolvePhenology(rp.speciesId, rp.cultivarId);
    }),
  );
  return fruitBloomMonthCountsForPhenologies(phenologies);
});

const monthBlockClass = (rawCount: number): string => {
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
</script>

<template>
  <footer
    class="shrink-0 border-t border-parchment-300 paper-surface px-2 py-1.5 text-ink-600 shadow-parchment"
    aria-label="Garden overview"
  >
    <div
      class="flex flex-col gap-1 w-full max-w-3xl mx-auto"
      aria-label="All plants: fruit and bloom by month"
    >
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
            :key="`fh-${i}`"
            class="flex-1 min-w-0 text-center text-[10px] leading-none font-medium text-ink-500"
            :title="monthHeaderTooltip(gardenTooltipRows, i, CATALOG_MONTH_LABELS[i])"
            >{{ lab }}</span
          >
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
            v-for="(count, i) in gardenMonthPhenologyCounts.fruiting"
            :key="`ff-${i}`"
            role="listitem"
            class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
            :class="monthBlockClass(count)"
            :title="
              monthAspectTooltip(
                gardenTooltipRows,
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
            v-for="(count, i) in gardenMonthPhenologyCounts.blooming"
            :key="`fb-${i}`"
            role="listitem"
            class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
            :class="monthBlockClass(count)"
            :title="
              monthAspectTooltip(
                gardenTooltipRows,
                i,
                'blooming',
                CATALOG_MONTH_LABELS[i],
              )
            "
          />
        </div>
      </div>
    </div>
  </footer>
</template>
