<script lang="ts" setup>
  import { CATALOG_MONTH_LABELS, CATALOG_MONTH_LABELS_2 } from './plantCatalog';
  import GuildCardSectionLabel from './GuildCardSectionLabel.vue';
  import {
    monthAspectTooltip,
    monthHeaderTooltip,
    type GuildPlantTooltipRow,
  } from './guildPlantTooltips';

  defineProps<{
    fruiting: number[];
    blooming: number[];
    tooltipRows: GuildPlantTooltipRow[];
  }>();

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
  <div
    class="flex flex-col gap-1 w-full min-w-0 shrink-0"
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
          :title="monthHeaderTooltip(tooltipRows, i, CATALOG_MONTH_LABELS[i])"
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
          v-for="(count, i) in fruiting"
          :key="`f-${i}`"
          role="listitem"
          class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
          :class="monthBlockClass(count)"
          :title="monthAspectTooltip(tooltipRows, i, 'fruiting', CATALOG_MONTH_LABELS[i])"
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
          v-for="(count, i) in blooming"
          :key="`b-${i}`"
          role="listitem"
          class="flex-1 min-w-0 rounded-md h-3 border border-parchment-400/50"
          :class="monthBlockClass(count)"
          :title="monthAspectTooltip(tooltipRows, i, 'blooming', CATALOG_MONTH_LABELS[i])"
        />
      </div>
    </div>
  </div>
</template>
