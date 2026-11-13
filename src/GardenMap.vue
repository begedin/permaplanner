<script setup lang="ts">
  import { computed, onScopeDispose, ref, watch } from 'vue';
  import { useElementSize } from '@vueuse/core';
  import GardenAerial from './GardenAerial.vue';
  import GuildLayout from './GuildLayout.vue';
  import { useBackgroundImage } from './useBackgroundImage';
  import { useCamera } from './useCamera';
  import { useCameraStore } from './useCameraStore';
  import { useGuildLayout } from './useGuildLayoutState';
  import { useMapViewTransition } from './useMapViewTransition';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import { pathBounds } from './guildPathBounds';

  const { guild, placingThingId } = useGuildLayout();
  const camera = useCameraStore();
  const plan = usePermaplannerStore();
  const svg = ref<SVGSVGElement>();
  const { width, height } = useElementSize(svg);
  const viewport = computed(() => ({ width: width.value, height: height.value }));
  const { imgDataUrl, imgWidth, imgHeight, ready } = useBackgroundImage();
  const worldBounds = computed(() =>
    ready.value
      ? { width: imgWidth.value, height: imgHeight.value }
      : { width: 1000, height: 1000 },
  );
  const dimensions = computed(() => ({
    containerWidth: width.value,
    containerHeight: height.value,
    worldWidth: worldBounds.value.width,
    worldHeight: worldBounds.value.height,
  }));
  const { fitToViewPort, setupCamera, teardownCamera } = useCamera(svg, dimensions);
  watch(
    [worldBounds, () => width.value > 0 && height.value > 0],
    () => {
      if (width.value > 0 && height.value > 0) fitToViewPort();
    },
    { immediate: true },
  );
  watch(
    dimensions,
    (value) => {
      if (value.containerWidth > 0 && value.containerHeight > 0)
        camera.scale = Math.min(
          value.containerWidth / value.worldWidth,
          value.containerHeight / value.worldHeight,
        );
    },
    { immediate: true },
  );

  const view = computed(() => guild.value?.id);
  const target = computed(() => {
    if (!guild.value) {
      const { x, y, width, height } = camera;
      return { x, y, width, height };
    }
    const box = pathBounds(guild.value.path.flat(2));
    const padding = Math.max(box.width, box.height) * 0.08 || 10;
    const aspect = width.value > 0 && height.value > 0 ? width.value / height.value : 1;
    const w = Math.max(box.width + padding * 2, (box.height + padding * 2) * aspect);
    const h = w / aspect;
    return {
      x: box.x + (box.width - w) / 2,
      y: box.y + (box.height - h) / 2,
      width: w,
      height: h,
    };
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

  watch(
    [svg, view, transitioning],
    ([element, layoutId, moving]) => {
      teardownCamera();
      if (element && !layoutId && !moving) setupCamera();
    },
    { flush: 'post' },
  );
  onScopeDispose(teardownCamera);
</script>

<template>
  <section
    class="relative flex min-h-0 min-w-0 flex-1 flex-col"
    :class="guild ? 'gap-2 p-3' : ''"
    :aria-label="guild ? 'Plant layout' : 'Aerial map'"
    :data-view-transition="transitioning ? 'active' : undefined"
    :inert="transitioning"
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
        :world-bounds="worldBounds"
        :viewport="viewport"
      />
    </template>
    <svg
      ref="svg"
      :viewBox="viewBox"
      :data-main-svg="guild ? undefined : ''"
      data-map-camera
      :tabindex="guild ? 0 : undefined"
      :aria-label="guild ? 'Draw plant canopies' : undefined"
      preserveAspectRatio="xMinYMin meet"
      class="min-h-0 w-full flex-1"
      :class="{
        'rounded-lg border border-parchment-400 bg-parchment-200': guild,
        'cursor-crosshair': placingThingId,
      }"
      style="touch-action: none"
    >
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
    </svg>
  </section>
</template>
