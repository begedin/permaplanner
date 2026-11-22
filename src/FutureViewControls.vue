<script setup lang="ts">
  import { computed } from 'vue';
  import { useFutureView, FUTURE_HORIZONS } from './useFutureView';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useGardenStore } from './useGardenStore';
  import { hasPlantPlacement } from './gardenTypes';

  const future = useFutureView();
  const sliderPosition = computed({
    get: () => FUTURE_HORIZONS.indexOf(future.horizon),
    set: (index: number) => {
      future.horizon = FUTURE_HORIZONS[index]!;
    },
  });
  const horizonLabel = computed(() => {
    if (future.horizon === 'now') return 'Now';
    if (future.horizon === 'final') return 'Final';
    return future.horizon === 1 ? '1 year' : `${future.horizon} years`;
  });
  const garden = useGardenStore();
  const scale = useMapScaleStore();
  const placed = computed(() =>
    garden.guilds
      .filter((g) => g.path.length)
      .flatMap((g) => g.plants.filter(hasPlantPlacement)),
  );
  const hasYearEstimate = computed(() =>
    placed.value.some((plant) => future.profiles.get(plant.plantId)?.maturityYears),
  );
  const missingWidth = computed(
    () =>
      placed.value.filter(
        (plant) => !plant.matureSpreadM && !future.profiles.get(plant.plantId)?.spreadM,
      ).length,
  );
</script>

<template>
  <div
    class="shrink-0 border-t border-parchment-400 bg-parchment-100 px-3 py-2 text-sm text-ink-700"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div class="flex w-full max-w-xs items-center gap-2">
        <label
          for="future-horizon"
          class="shrink-0 font-medium"
          >Future view</label
        >
        <input
          id="future-horizon"
          v-model.number="sliderPosition"
          type="range"
          min="0"
          :max="FUTURE_HORIZONS.length - 1"
          step="1"
          list="future-stops"
          :aria-valuetext="horizonLabel"
          class="h-7 min-w-0 flex-1 cursor-pointer accent-sage-600"
        />
        <datalist id="future-stops">
          <option
            v-for="(horizon, index) in FUTURE_HORIZONS"
            :key="horizon"
            :value="index"
          />
        </datalist>
        <span class="w-14 shrink-0 tabular-nums">{{ horizonLabel }}</span>
      </div>
      <span
        v-if="future.horizon !== 'now'"
        class="text-xs"
        aria-live="polite"
      >
        <template v-if="!scale.measurement.pixelsPerMeter"
          >Set the aerial map scale and unit to see plant spreads.</template
        >
        <template v-else-if="!placed.length"
          >Place a plant on the map to see its future spread.</template
        >
        <template v-else-if="future.horizon !== 'final' && !hasYearEstimate"
          >No placed tree or shrub has a yearly estimate. Select Final to see mature
          widths.</template
        >
        <template v-else>
          <span
            class="mr-1 inline-block w-5 align-middle border-t-2 border-dashed border-amber-800"
          ></span>
          {{
            future.horizon === 'final'
              ? 'Typical mature spread'
              : 'Estimated tree and shrub spread'
          }}
          <span v-if="future.horizon === 'final' && missingWidth">
            · {{ missingWidth }} without a mature width</span
          >
        </template>
      </span>
      <div
        v-if="
          future.horizon !== 'now' && scale.measurement.pixelsPerMeter && placed.length
        "
        class="text-xs"
      >
        <button
          type="button"
          popovertarget="future-view-method"
          class="link-soft"
        >
          How sizes are estimated
        </button>
        <p
          id="future-view-method"
          popover="auto"
          class="paper-floating m-auto w-80 max-w-[90vw] p-4 text-sm text-ink-700"
        >
          Year views estimate canopy growth for trees and shrubs with a published maturity
          period. Each year adds an equal share of the mature width to the width drawn
          today, up to the mature width. Final shows the typical mature width of one plant
          or clump. Site, pruning and rootstock affect actual size.
        </p>
      </div>
    </div>
  </div>
</template>
