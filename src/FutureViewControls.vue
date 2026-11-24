<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { useFutureView, FUTURE_HORIZONS } from './useFutureView';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useGardenStore } from './useGardenStore';
  import { hasPlantPlacement } from './gardenTypes';

  const future = useFutureView();
  const showHelp = ref(false);
  const sliderPosition = computed({
    get: () => FUTURE_HORIZONS.indexOf(future.horizon),
    set: (index: number) => {
      future.horizon = FUTURE_HORIZONS[index]!;
    },
  });
  const horizonLabel = computed(() => {
    if (future.horizon === 'now') return 'Off';
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
      placed.value.filter((plant) => future.projectedWidthM(plant, 'final') === undefined)
        .length,
  );
</script>

<template>
  <div class="flex flex-col gap-1 text-sm text-ink-700">
    <div class="flex items-center gap-1">
      <label
        for="future-horizon"
        class="font-medium"
        >Future view</label
      >
      <button
        type="button"
        :aria-controls="showHelp ? 'future-view-method' : undefined"
        :aria-expanded="showHelp"
        aria-label="How sizes are estimated"
        title="How sizes are estimated"
        class="flex size-6 items-center justify-center rounded-full text-ink-600 hover:bg-sage-200/75"
        @click="showHelp = !showHelp"
      >
        <span class="flex size-4 items-center justify-center rounded-full border text-xs"
          >?</span
        >
      </button>
      <span class="ml-auto tabular-nums">{{ horizonLabel }}</span>
    </div>
    <input
      id="future-horizon"
      v-model.number="sliderPosition"
      type="range"
      min="0"
      :max="FUTURE_HORIZONS.length - 1"
      step="1"
      list="future-stops"
      :aria-valuetext="horizonLabel"
      class="h-5 w-full cursor-pointer accent-sage-600"
    />
    <datalist id="future-stops">
      <option
        v-for="(horizon, index) in FUTURE_HORIZONS"
        :key="horizon"
        :value="index"
      />
    </datalist>
    <Transition name="future-help">
      <div
        v-if="showHelp"
        id="future-view-method"
        class="grid grid-rows-[1fr] text-xs leading-relaxed"
      >
        <div class="min-h-0 space-y-1 overflow-hidden">
          <p v-if="!scale.measurement.pixelsPerMeter">
            Set the aerial map scale and unit to see plant spreads.
          </p>
          <p v-else-if="!placed.length">
            Place a plant on the map to see its future spread.
          </p>
          <p v-else-if="!hasYearEstimate">
            These plants have no yearly estimate. Final shows their known mature widths.
          </p>
          <p v-if="missingWidth">
            Final skips plants with an unknown mature width ({{ missingWidth }}).
          </p>
          <p>
            <span
              aria-hidden="true"
              class="mr-1 inline-block w-5 align-middle border-t-2 border-dashed border-amber-800"
            ></span>
            Dashed circles show projected plant widths. Final shows one mature plant or
            clump.
          </p>
          <p>
            Year views estimate canopy growth for trees and shrubs. Each year adds the
            mature width divided by the published years to maturity, up to the mature
            width. Site, pruning and rootstock affect actual size.
          </p>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
  .future-help-enter-active,
  .future-help-leave-active {
    transition:
      grid-template-rows 200ms ease,
      opacity 200ms ease;
  }

  .future-help-enter-from,
  .future-help-leave-to {
    grid-template-rows: 0fr;
    opacity: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    .future-help-enter-active,
    .future-help-leave-active {
      transition: none;
    }
  }
</style>
