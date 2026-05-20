<script setup lang="ts">
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import GardenGuild from './GardenGuild.vue';
import { useGardenStore, type Guild } from './useGardenStore';
import { useCameraStore } from './useCameraStore';
import { useMapScaleStore } from './useMapScaleStore';
import { useScene } from './useScene';

import { useBackgroundImage } from './useBackgroundImage';
import { useCamera } from './useCamera';
import { useElementSize } from '@vueuse/core';
import GuildTabHeader from './GuildTabHeader.vue';
import OnboardingText from './OnboardingText.vue';
import ThingBarGuild from './ThingBarGuild.vue';
import { useGuildSelection } from './useGuildSelection';
import ReferenceLine from './ReferenceLine.vue';
import { useOnboardingStore } from './useOnboardingStore';
import { isGithubStorageLinked } from './githubRepoSync';
import { usePermaplannerStore } from './usePermaplannerStore';

const permaplannerStore = usePermaplannerStore();

const showThingBar = computed(
  () => Boolean(permaplannerStore.fileName) || isGithubStorageLinked(),
);

const {
  setupBackgroundImagePaste,
  teardownBackgroundImagePaste,
  imgWidth,
  imgHeight,
  imgDataUrl,
  ready,
} = useBackgroundImage();

onBeforeMount(() => {
  setupBackgroundImagePaste();
});

onBeforeUnmount(() => teardownBackgroundImagePaste());

const container = ref<SVGElement>();

const { width: containerWidth, height: containerHeight } = useElementSize(container);

const PLACEHOLDER_WORLD_BASE = 1000;

const worldBounds = computed(() => {
  if (ready.value && imgWidth.value > 0 && imgHeight.value > 0) {
    return { width: imgWidth.value, height: imgHeight.value };
  }
  const cw = containerWidth.value;
  const ch = containerHeight.value;
  if (cw <= 0 || ch <= 0) {
    return { width: PLACEHOLDER_WORLD_BASE, height: PLACEHOLDER_WORLD_BASE };
  }
  return { width: PLACEHOLDER_WORLD_BASE, height: (PLACEHOLDER_WORLD_BASE * ch) / cw };
});

const cameraParams = computed(() => ({
  containerHeight: containerHeight.value,
  containerWidth: containerWidth.value,
  worldWidth: worldBounds.value.width,
  worldHeight: worldBounds.value.height,
}));

const { setupCamera, teardownCamera, fitToViewPort } = useCamera(container, cameraParams);

const cameraInitialized = ref(false);

watch(
  () => ({
    el: container.value,
    cw: containerWidth.value,
    ch: containerHeight.value,
    ww: worldBounds.value.width,
    wh: worldBounds.value.height,
  }),
  (v, prev) => {
    if (prev?.el && !v.el) {
      teardownCamera();
      cameraInitialized.value = false;
      return;
    }
    if (!v.el || v.cw <= 0 || v.ch <= 0 || v.ww <= 0 || v.wh <= 0) {
      return;
    }
    const worldDimsChanged = !prev || prev.ww !== v.ww || prev.wh !== v.wh;
    const containerBecameValid =
      !!prev && (prev.cw <= 0 || prev.ch <= 0) && v.cw > 0 && v.ch > 0;
    if (worldDimsChanged || containerBecameValid) {
      fitToViewPort();
    }
    if (!cameraInitialized.value) {
      setupCamera();
      cameraInitialized.value = true;
    }
  },
  { immediate: true },
);

const camera = useCameraStore();

onBeforeUnmount(() => teardownCamera());

const svgViewbox = computed(() => {
  const x = camera.x.toFixed(2);
  const y = camera.y.toFixed(2);
  const width = camera.width.toFixed(2);
  const height = camera.height.toFixed(2);
  return `${x} ${y} ${width} ${height}`;
});

const center = computed(() => {
  const x = camera.x / camera.scale;
  const y = camera.y / camera.scale;
  const width = containerWidth.value / camera.scale;
  const height = containerHeight.value / camera.scale;
  return { x: x + width / 2, y: y + height / 2 };
});

const worldStage = ref<SVGRectElement>();

const onboarding = useOnboardingStore();

const mapScale = useMapScaleStore();

useScene(container, worldStage);

const garden = useGardenStore();
const { selectedGuildId, selectGuild, clearSelection } = useGuildSelection();

const placedGuilds = computed(() => garden.guilds.filter((g) => g.path.length > 0));

/** Selected guild is drawn first so other beds stay clickable on top while editing. */
const placedGuildsRenderOrder = computed(() => {
  const placed = placedGuilds.value;
  const selected = selectedGuildId.value;
  if (!selected) {
    return placed;
  }
  const selectedGuild = placed.find((g) => g.id === selected);
  if (!selectedGuild) {
    return placed;
  }
  return [selectedGuild, ...placed.filter((g) => g.id !== selected)];
});

const placementGuildDraft = computed(() => {
  const id = selectedGuildId.value;
  if (!id) {
    return undefined;
  }
  const g = garden.guilds.find((x) => x.id === id);
  if (!g || g.path.length > 0) {
    return undefined;
  }
  return g;
});

onMounted(() => {
  document.addEventListener('keydown', (e): void => {
    if (e.key === 'Delete' && selectedGuildId.value !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      const id = selectedGuildId.value;
      garden.deleteFeature(id);
      if (!garden.guilds.some((g) => g.id === id)) {
        void clearSelection();
      }
    }
  });
});

const updateGuild = (guild: Guild) => {
  const index = garden.guilds.findIndex((g) => g.id === guild.id);
  if (index === -1) {
    return;
  }
  garden.guilds[index] = guild;
  void clearSelection();
};
</script>

<template>
  <div class="flex flex-col h-full min-h-0 bg-emerald-50/40">
    <GuildTabHeader title="Aerial" />

    <div class="flex flex-1 min-h-0">
      <aside
        v-if="showThingBar"
        class="flex flex-col min-h-0 min-w-0 border-r border-slate-200/80 bg-white/60 w-full md:w-72 md:shrink-0"
        aria-label="Guild list"
      >
        <div class="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
          <ThingBarGuild
            v-for="guild in garden.guilds"
            :id="guild.id"
            :key="guild.id"
          />
        </div>
      </aside>

      <section
        class="flex flex-1 min-h-0 min-w-0 flex-col"
        aria-label="Aerial map"
      >
        <svg
          ref="container"
          :viewBox="svgViewbox"
          data-main-svg
          preserveAspectRatio="xMinYMin meet"
          class="flex-1 min-h-0 w-full"
        >
          <defs>
            <pattern
              id="grid"
              :height="mapScale.unitLengthPx"
              :width="mapScale.unitLengthPx"
              patternUnits="userSpaceOnUse"
            >
              <path
                :d="`M ${mapScale.unitLengthPx} 0 L 0 0 0 ${mapScale.unitLengthPx}`"
                fill="none"
                stroke="gray"
                stroke-width="0.5"
              />
            </pattern>

            <radialGradient
              id="bed-gradient"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop
                offset="0%"
                style="stop-color: #fff; stop-opacity: 1"
              />
              <stop
                offset="100%"
                style="stop-color: #000; stop-opacity: 0"
              />
            </radialGradient>
          </defs>
          <rect
            ref="worldStage"
            x="0"
            y="0"
            :width="worldBounds.width"
            :height="worldBounds.height"
            class="fill-slate-100"
            data-world-stage
          />
          <image
            v-if="imgDataUrl"
            :href="imgDataUrl"
            x="0"
            y="0"
            :width="worldBounds.width"
            :height="worldBounds.height"
            :opacity="permaplannerStore.backgroundOpacity"
          />
          <text
            v-else
            :x="worldBounds.width / 2"
            :y="worldBounds.height / 2"
            fill="red"
            text-anchor="middle"
            dominant-baseline="middle"
            data-onboarding-text
          >
            Paste an aerial photo of your plot of land here. You can use Google Maps to
            take a screenshot
          </text>
          <rect
            v-if="mapScale.unitLengthPx"
            x="0"
            y="0"
            :width="worldBounds.width"
            :height="worldBounds.height"
            fill="url(#grid)"
            class="pointer-events-none"
          />
          <GardenGuild
            v-for="guild in placedGuildsRenderOrder"
            :key="guild.id"
            :selected="selectedGuildId === guild.id"
            :hovered="garden.hoveredId === guild.id"
            :guild="guild"
            :unit-length-px="mapScale.unitLengthPx"
            @cancel="clearSelection"
            @click.exact="selectGuild(guild.id)"
            @click.shift="garden.removeGuildFromAerialMap(guild.id)"
            @mouseenter="garden.hoveredId = guild.id"
            @mouseleave="garden.hoveredId = undefined"
            @update="updateGuild"
          ></GardenGuild>

          <GardenGuild
            v-if="placementGuildDraft"
            :guild="placementGuildDraft"
            :unit-length-px="mapScale.unitLengthPx"
            hovered
            selected
            @update="updateGuild"
            @cancel="clearSelection"
          />

          <OnboardingText
            v-if="imgDataUrl && onboarding.onboardingState !== 'done'"
            :x="center.x"
            :y="center.y"
            :onboarding-state="onboarding.onboardingState"
          />

          <ReferenceLine />
        </svg>
      </section>
    </div>
  </div>
</template>
