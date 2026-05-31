<script lang="ts" setup>
  import { computed } from 'vue';

  import {
    CATALOG_MONTH_LABELS,
    CATALOG_MONTH_LABELS_2,
    fruitBloomMonthCountsForPhenologies,
  } from './plantCatalog';
  import type { GuildPlantTooltipRow } from './guildPlantTooltips';
  import { monthAspectTooltip, monthHeaderTooltip } from './guildPlantTooltips';
  import GuildCardSectionLabel from './GuildCardSectionLabel.vue';

  const props = defineProps<{
    tooltipRows: GuildPlantTooltipRow[];
    calendarAriaLabel: string;
    showSectionLabel?: boolean;
    compact?: boolean;
  }>();

  const monthCounts = computed(() =>
    fruitBloomMonthCountsForPhenologies(props.tooltipRows.map((r) => r.phenology)),
  );

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
    class="flex flex-col w-full shrink-0"
    :class="compact ? 'gap-0.5' : 'gap-1'"
    :aria-label="calendarAriaLabel"
  >
    <GuildCardSectionLabel v-if="showSectionLabel !== false">
      Season
    </GuildCardSectionLabel>
    <div
      class="flex flex-row items-end gap-1 w-full"
      aria-label="Months"
    >
      <span
        class="shrink-0"
        :class="compact ? 'w-7' : 'w-9'"
        aria-hidden="true"
      />
      <div
        class="flex flex-row flex-1 min-w-0"
        :class="compact ? 'gap-px' : 'gap-0.5'"
      >
        <span
          v-for="(lab, i) in CATALOG_MONTH_LABELS_2"
          :key="`mh-${i}`"
          class="flex-1 min-w-0 text-center leading-none font-medium text-ink-500"
          :class="compact ? 'text-[8px]' : 'text-[10px]'"
          :title="monthHeaderTooltip(tooltipRows, i, CATALOG_MONTH_LABELS[i])"
        >
          {{ lab }}
        </span>
      </div>
    </div>
    <div
      class="flex flex-row items-center w-full"
      :class="compact ? 'gap-0.5' : 'gap-1'"
      role="group"
      aria-label="Fruiting by month"
    >
      <span
        class="text-ink-500 shrink-0"
        :class="compact ? 'text-[8px] w-7' : 'text-[10px] w-9'"
      >
        Fruit
      </span>
      <div
        class="flex flex-row flex-1 min-w-0"
        :class="compact ? 'gap-px' : 'gap-0.5'"
        role="list"
      >
        <div
          v-for="(count, i) in monthCounts.fruiting"
          :key="`f-${i}`"
          role="listitem"
          class="flex-1 min-w-0 rounded-md border border-parchment-400/50"
          :class="[compact ? 'h-2' : 'h-3', monthBlockClass(count)]"
          :title="monthAspectTooltip(tooltipRows, i, 'fruiting', CATALOG_MONTH_LABELS[i])"
        />
      </div>
    </div>
    <div
      class="flex flex-row items-center w-full"
      :class="compact ? 'gap-0.5' : 'gap-1'"
      role="group"
      aria-label="Blooming by month"
    >
      <span
        class="text-ink-500 shrink-0"
        :class="compact ? 'text-[8px] w-7' : 'text-[10px] w-9'"
      >
        Bloom
      </span>
      <div
        class="flex flex-row flex-1 min-w-0"
        :class="compact ? 'gap-px' : 'gap-0.5'"
        role="list"
      >
        <div
          v-for="(count, i) in monthCounts.blooming"
          :key="`b-${i}`"
          role="listitem"
          class="flex-1 min-w-0 rounded-md border border-parchment-400/50"
          :class="[compact ? 'h-2' : 'h-3', monthBlockClass(count)]"
          :title="monthAspectTooltip(tooltipRows, i, 'blooming', CATALOG_MONTH_LABELS[i])"
        />
      </div>
    </div>
  </div>
</template>
