<script setup lang="ts">
  import { computed, onScopeDispose, provide, ref, toRef, watch } from 'vue';
  import { useElementSize } from '@vueuse/core';
  import GardenAerial from './GardenAerial.vue';
  import GuildLayout from './GuildLayout.vue';
  import { useFutureView } from './useFutureView';
  import { hasPlantPlacement } from './gardenTypes';
  import { useBackgroundImage } from './useBackgroundImage';
  import { useCamera } from './useCamera';
  import { fitGuildView, type CameraFocus } from './useCameraViewport';
  import { useGuildLayout } from './useGuildLayoutState';
  import { useMapInteractionStore } from './useMapInteractionStore';
  import { mapViewportKey, useMapViewTransition } from './useMapViewTransition';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { pathBounds } from './guildPathBounds';

  import { aerialMapBoundsKey } from './aerialMapBounds';

  const props = defineProps<{ aerialFocus?: CameraFocus }>();
  const { guild, placingThingId } = useGuildLayout();
  const interaction = useMapInteractionStore();
  const future = useFutureView();
  const plan = usePermaplannerStore();
  const svg = ref<SVGSVGElement>();
  const { width, height } = useElementSize(svg);
  const { imgDataUrl, mapSize: worldBounds } = useBackgroundImage();
  provide(aerialMapBoundsKey, worldBounds);
  const dimensions = computed(() => ({
    containerWidth: width.value,
    containerHeight: height.value,
    worldWidth: worldBounds.value?.width ?? 0,
    worldHeight: worldBounds.value?.height ?? 0,
  }));
  const { camera, setupCamera, teardownCamera } = useCamera(
    svg,
    dimensions,
    () => interaction.activeTool !== 'draw',
    toRef(props, 'aerialFocus'),
  );

  const view = computed(() => guild.value?.id);
  const target = computed(() => {
    if (!guild.value) {
      const { x, y, width, height } = camera;
      return { x, y, width, height };
    }
    const points = guild.value.path.flat(2);
    if (future.horizon !== 'now') {
      for (const plant of guild.value.plants.filter(hasPlantPlacement)) {
        const outline = future.footprint(
          plant,
          future.horizon === 'final' ? 'final' : 20,
        );
        if (!outline) continue;
        const r = Math.max(outline.r, plant.width / 2);
        points.push(
          { x: outline.cx - r, y: outline.cy - r },
          { x: outline.cx + r, y: outline.cy + r },
        );
      }
    }
    return fitGuildView(pathBounds(points), width.value, height.value).bounds;
  });
  const { bounds, transitioning } = useMapViewTransition(target, view);
  const viewBox = computed(
    () =>
      `${bounds.value.x} ${bounds.value.y} ${bounds.value.width} ${bounds.value.height}`,
  );
  const pixelsPerUnit = computed(
    () =>
      Math.min(width.value / bounds.value.width, height.value / bounds.value.height) || 1,
  );
  provide(
    mapViewportKey,
    computed(() => ({
      x: bounds.value.x,
      y: bounds.value.y,
      width: width.value / pixelsPerUnit.value,
      height: height.value / pixelsPerUnit.value,
    })),
  );

  watch(
    [svg, view, transitioning, worldBounds],
    ([element, layoutId, moving, size]) => {
      if (element && !layoutId && !moving) setupCamera(!!size);
      else teardownCamera();
    },
    { flush: 'post' },
  );
  onScopeDispose(teardownCamera);
</script>

<template>
  <section
    class="relative flex min-h-0 min-w-0 flex-1 flex-col"
    :class="guild ? 'gap-2 p-3' : '@container'"
    :aria-label="guild ? 'Plant layout' : 'Aerial map'"
    :inert="transitioning"
    :data-view-transition="transitioning ? 'active' : undefined"
  >
    <template v-if="svg">
      <GuildLayout
        v-if="guild"
        :key="guild.id"
        :guild="guild"
        :svg="svg"
        :pixels-per-unit="pixelsPerUnit"
      />
      <GardenAerial
        v-else
        :svg="svg"
      />
    </template>
    <svg
      ref="svg"
      :viewBox="viewBox"
      :data-main-svg="guild ? undefined : ''"
      data-map-camera
      tabindex="0"
      :aria-label="guild ? 'Draw plant canopies' : 'Aerial map canvas'"
      preserveAspectRatio="xMinYMin meet"
      class="min-h-0 w-full flex-1 touch-none"
      :class="{
        'rounded-lg border border-parchment-400 bg-parchment-200': guild,
        'cursor-crosshair': placingThingId,
      }"
    >
      <g>
        <template v-if="worldBounds">
          <rect
            x="0"
            y="0"
            :width="worldBounds.width"
            :height="worldBounds.height"
            class="fill-parchment-200"
            data-world-stage
          />
          <image
            v-if="imgDataUrl"
            :href="imgDataUrl"
            x="0"
            y="0"
            :width="worldBounds.width"
            :height="worldBounds.height"
            :opacity="plan.backgroundOpacity"
          />
        </template>
      </g>
    </svg>
  </section>
</template>
