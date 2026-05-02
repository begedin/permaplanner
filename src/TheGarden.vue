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
import OnboardingText from './OnboardingText.vue';
import ThingBar from './ThingBar.vue';
import ToolSlider from './ToolSlider.vue';
import ReferenceLine from './ReferenceLine.vue';
import { useOnboardingStore } from './useOnboardingStore';
import GithubRepoSyncPanel from './GithubRepoSyncPanel.vue';
import { usePermaplannerStore } from './usePermaplannerStore';
import { usePlanSession } from './usePlanSession';

const permaplannerStore = usePermaplannerStore();

const {
  isRestoringSession,
  awaitingReopenFileClick,
  expectedRelinkName,
  continueReopenPersistedFile,
  load,
  newPlan,
  save,
  saveAs,
} = usePlanSession();

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

const cameraParams = computed(() => ({
  containerHeight: containerHeight.value,
  containerWidth: containerWidth.value,
  backgroundNaturalHeight: imgHeight.value,
  backgroundNaturalWidth: imgWidth.value,
}));

const { setupCamera, teardownCamera, fitToViewPort } = useCamera(container, cameraParams);

const disabled = ref(true);

watch(ready, async () => {
  if (!ready.value) {
    return;
  }

  fitToViewPort();
  setupCamera();

  setTimeout(() => {
    fitToViewPort();
    disabled.value = false;
  }, 1000);
});

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

const bgImage = ref<SVGImageElement>();

const onboarding = useOnboardingStore();

const mapScale = useMapScaleStore();

useScene(container, bgImage);

const garden = useGardenStore();

const placedGuilds = computed(() => garden.guilds.filter((g) => g.path.length > 0));

const placementGuildDraft = computed(() => {
  const id = garden.selectedId;
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
    if (e.key === 'Delete' && garden.selectedId !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      garden.deleteFeature(garden.selectedId);
    }
  });
});

const updateGuild = (guild: Guild) => {
  const index = garden.guilds.findIndex((g) => g.id === guild.id);
  if (index === -1) {
    return;
  }
  garden.guilds[index] = guild;
  garden.selectedId = undefined;
  garden.hoveredId = undefined;
};

</script>

<template>
  <div class="flex flex-row items-stretch h-full">
    <div class="p-2 flex w-[200px] flex-col items-stretch gap-1 bg-gray-50">
      <p
        v-if="isRestoringSession && !permaplannerStore.fileName"
        class="p-1 text-sm text-slate-500"
        role="status"
        aria-live="polite"
      >
        Looking for a saved plan…
      </p>
      <div
        v-if="awaitingReopenFileClick && !permaplannerStore.fileName"
        class="p-2 mb-1 rounded text-sm bg-sky-100 text-sky-950 border border-sky-200"
      >
        <p class="font-medium">Continue with your saved file</p>
        <p
          v-if="expectedRelinkName"
          class="mt-1"
        >
          <code class="text-xs bg-sky-50 px-1 rounded">{{ expectedRelinkName }}</code>
        </p>
        <p class="mt-1.5 text-sky-900/90">
          The browser needs a click to allow read access after a reload.
        </p>
        <button
          type="button"
          class="mt-2 w-full bg-sky-200 hover:bg-sky-300 rounded p-1"
          @click="continueReopenPersistedFile"
        >
          Allow access and open
        </button>
      </div>
      <div
        v-if="permaplannerStore.needsFileRelink && !permaplannerStore.fileName"
        class="p-2 mb-1 rounded text-sm bg-amber-100 text-amber-950 border border-amber-200"
      >
        <p class="font-medium">Could not open the saved file</p>
        <p
          v-if="expectedRelinkName"
          class="mt-1"
        >
          It was
          <code class="text-xs bg-amber-50 px-1 rounded">{{ expectedRelinkName }}</code>
        </p>
        <p
          v-else
          class="mt-1"
        >
          The file link is no longer available.
        </p>
        <p class="mt-1.5 text-amber-900/90">
          Choose that file again, or a different <code class="text-xs">.json</code> if you
          renamed it.
        </p>
        <button
          type="button"
          class="mt-2 w-full bg-amber-200 hover:bg-amber-300 rounded p-1 text-left"
          @click="load"
        >
          Choose file…
        </button>
      </div>
      <template v-if="permaplannerStore.fileName">
        <ToolSlider
          v-model:value="mapScale.linePhysicalLength"
          label="Map scale"
          :min="1"
          :max="300"
          :step="1"
        />
        <ToolSlider
          v-model:value="permaplannerStore.backgroundOpacity"
          label="BG opacity"
          :min="0"
          :max="1"
          :step="0.01"
        />
        <span>{{ permaplannerStore.fileName }}</span>
        <button
          class="bg-green-200 hover:bg-green-300 rounded p-1"
          @click="save"
        >
          Save plan
        </button>
        <button
          class="bg-green-200 hover:bg-green-300 rounded p-1"
          @click="saveAs"
        >
          Save as...
        </button>
      </template>
      <button
        v-if="!isRestoringSession"
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="load"
      >
        Open plan
      </button>
      <button
        v-if="!isRestoringSession"
        class="bg-green-200 hover:bg-green-300 rounded p-1"
        @click="newPlan"
      >
        New plan
      </button>
      <GithubRepoSyncPanel v-if="!isRestoringSession" />
    </div>

    <div class="flex flex-col flex-1">
      <div
        v-if="!permaplannerStore.fileName"
        class="m-auto text-center text-slate-600 max-w-md px-4"
        :aria-busy="isRestoringSession"
      >
        <template v-if="isRestoringSession">
          <p
            class="text-slate-500 animate-pulse"
            role="status"
            aria-live="polite"
          >
            Loading your plan…
          </p>
        </template>
        <template v-else-if="awaitingReopenFileClick">
          <p class="text-sky-800 font-medium">Open your saved plan</p>
          <p
            v-if="expectedRelinkName"
            class="mt-3"
          >
            Your last file was
            <code class="text-sm bg-sky-100 px-1 rounded">{{ expectedRelinkName }}</code>
            . Browsers require a click here to restore file access after you reload the page.
          </p>
          <p
            v-else
            class="mt-3"
          >
            Browsers require a click to restore file access after you reload the page.
          </p>
          <button
            type="button"
            class="mt-5 bg-sky-200 hover:bg-sky-300 rounded px-3 py-1.5"
            @click="continueReopenPersistedFile"
          >
            Allow access and open
          </button>
        </template>
        <template v-else-if="permaplannerStore.needsFileRelink">
          <p class="text-amber-800 font-medium">The plan file could not be read</p>
          <p
            v-if="expectedRelinkName"
            class="mt-3"
          >
            It was previously linked to
            <code class="text-sm bg-amber-100 px-1 rounded">{{
              expectedRelinkName
            }}</code>
            . The file may have been moved, deleted, or the browser revoked access to it.
          </p>
          <p
            v-else
            class="mt-3"
          >
            The saved file link is missing or no longer valid.
          </p>
          <p class="mt-3 text-slate-600">
            Open the same file to continue, or pick another
            <code class="text-sm bg-slate-100 px-1 rounded">.json</code> plan if you moved
            or renamed it.
          </p>
          <button
            type="button"
            class="mt-5 bg-green-200 hover:bg-green-300 rounded px-3 py-1.5"
            @click="load"
          >
            Choose a plan file
          </button>
        </template>
        <template v-else>
          <p>
            Open a <code class="text-sm bg-slate-100 px-1 rounded">.json</code> file or
            start a new plan. The app remembers your file link in this browser (so you can
            return after a refresh or a full restart) until you start a new plan. Your
            plan data still lives in that file, not in the app. After a reload you may need
            one click to let the browser read the file again.
          </p>
        </template>
      </div>
      <svg
        v-else
        ref="container"
        :viewBox="svgViewbox"
        data-main-svg
        :disabled="disabled"
        preserveAspectRatio="xMinYMin meet"
        class="min-h-0"
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
        <image
          v-if="imgDataUrl"
          ref="bgImage"
          :xlink:href="imgDataUrl"
          x="0"
          y="0"
          :width="imgWidth"
          :height="imgHeight"
          :opacity="permaplannerStore.backgroundOpacity"
        />
        <text
          v-else
          x="50%"
          y="50%"
          fill="red"
          text-anchor="middle"
          dominant-baseline="middle"
          data-onboarding-text
        >
          Paste an aerial photo of your plot of land here. You can use Google Maps to take
          a screenshot
        </text>
        <rect
          v-if="mapScale.unitLengthPx"
          x="0"
          y="0"
          :width="imgWidth"
          :height="imgHeight"
          fill="url(#grid)"
          class="pointer-events-none"
        />
        <GardenGuild
          v-for="guild in placedGuilds"
          :key="guild.id"
          :selected="garden.selectedId === guild.id"
          :hovered="garden.hoveredId === guild.id"
          :guild="guild"
          :unit-length-px="mapScale.unitLengthPx"
          @cancel="garden.deactivateAll"
          @click.exact="garden.editGuild(guild.id)"
          @click.shift="garden.removeGuild(guild.id)"
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
          @cancel="garden.deactivateAll"
        />

        <OnboardingText
          v-if="imgDataUrl && onboarding.onboardingState !== 'done'"
          :x="center.x"
          :y="center.y"
          :onboarding-state="onboarding.onboardingState"
        />

        <ReferenceLine />
      </svg>
    </div>
    <div
      v-if="permaplannerStore.fileName"
      class="overflow-y-auto w-[300px]"
    >
      <ThingBar />
    </div>
  </div>
</template>
