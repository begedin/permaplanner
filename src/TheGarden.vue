<script setup lang="ts">
/* global FileSystemFileHandle */
import { computed, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { v4 as uuidV4 } from 'uuid';

import GardenGuild from './GardenGuild.vue';
import GardenFeature from './GardenFeature.vue';
import { useGardenStore, type Guild, type GardenThing } from './useGardenStore';
import { useCameraStore } from './useCameraStore';
import { useSceneStore } from './useSceneStore';
import { useMapScaleStore } from './useMapScaleStore';
import { useScene } from './useScene';

import { useBackgroundImage } from './useBackgroundImage';
import { useCamera } from './useCamera';
import { useElementSize } from '@vueuse/core';
import OnboardingText from './OnboardingText.vue';
import ThingBar from './ThingBar.vue';
import ToolBarButton from './ToolBarButton.vue';
import ToolSlider from './ToolSlider.vue';
import ReferenceLine from './ReferenceLine.vue';
import { useOnboardingStore } from './useOnboardingStore';
import { usePermaplannerStore } from './usePermaplannerStore';
import {
  ensureReadAccess,
  getFileHandle,
  getPersistedBoundFileName,
} from './sessionFileHandle';

const permaplannerStore = usePermaplannerStore();

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

const expectedRelinkName = computed(() => getPersistedBoundFileName());

const isRestoringSession = ref(true);

const pendingReopenFileHandle = ref<FileSystemFileHandle | null>(null);
const awaitingReopenFileClick = ref(false);

const clearReopenFileUi = () => {
  pendingReopenFileHandle.value = null;
  awaitingReopenFileClick.value = false;
};

const isFilePermissionError = (e: unknown): boolean =>
  e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');

const tryRestorePersistedFile = async () => {
  const handle = await getFileHandle();
  if (!handle) {
    if (getPersistedBoundFileName()) {
      permaplannerStore.needsFileRelink = true;
    }
    return;
  }
  try {
    await permaplannerStore.load(handle, { skipBindingPersist: true });
  } catch (e) {
    if (isFilePermissionError(e)) {
      pendingReopenFileHandle.value = handle;
      awaitingReopenFileClick.value = true;
      return;
    }
    console.error('[permaplanner] Could not open restored file handle:', e);
    permaplannerStore.needsFileRelink = true;
  }
};

const continueReopenPersistedFile = async () => {
  const h = pendingReopenFileHandle.value ?? (await getFileHandle());
  if (!h) {
    clearReopenFileUi();
    return;
  }
  try {
    if (!(await ensureReadAccess(h))) {
      permaplannerStore.needsFileRelink = true;
      clearReopenFileUi();
      return;
    }
    await permaplannerStore.load(h, { skipBindingPersist: true });
  } catch (e) {
    console.error('[permaplanner] Could not open file after permission grant:', e);
    permaplannerStore.needsFileRelink = true;
  } finally {
    clearReopenFileUi();
  }
};

onMounted(() => {
  void (async () => {
    try {
      await tryRestorePersistedFile();
    } finally {
      isRestoringSession.value = false;
    }
  })();

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
  garden.guilds[index] = guild;
  garden.selectedId = undefined;
  garden.hoveredId = undefined;
};

const scene = useSceneStore();

// bed drawing

const addNewGuild = (guild: Guild) => {
  garden.guilds.push(guild);
  garden.newGuild = undefined;
};

// feature drawing

const getNewShape = (plantId: string): GardenThing => {
  const x = Math.min(scene.worldBox.x, scene.worldBox.x + scene.worldBox.width);
  const y = Math.min(scene.worldBox.y, scene.worldBox.y + scene.worldBox.height);
  const width = Math.abs(scene.worldBox.width);
  const height = Math.abs(scene.worldBox.height);

  return {
    id: uuidV4(),
    plantId,
    x,
    y,
    width,
    height,
    nameOrCultivar:
      garden.plantsById[plantId].cultivar || garden.plantsById[plantId].name,
  };
};

const newShape = computed<GardenThing | void>(() => {
  if (!scene.isDrawing || !garden.plant) {
    return;
  }

  return getNewShape(garden.plant.id);
});

watch(
  () => scene.isDrawing,
  (isDrawing) => {
    if (!isDrawing && garden.plant) {
      // just finished drawing
      const shape = getNewShape(garden.plant.id);
      const overlappingGuild = garden.getOverlappingGuild(shape);

      if (!overlappingGuild) {
        return;
      }

      overlappingGuild.plants.push({
        ...shape,
        x: shape.x,
        y: shape.y,
        nameOrCultivar: garden.plant.cultivar || garden.plant.name,
      });
    }
  },
);

const fileOptions = (fileName: string = 'myNewPlan.json') => ({
  types: [{ accept: { 'application/json': ['.json' as const] } }],
  suggestedName: fileName,
  startIn: 'documents' as const,
});

const load = async () => {
  clearReopenFileUi();
  const options = fileOptions();
  try {
    const [fileHandle] = await window.showOpenFilePicker(options);
    await permaplannerStore.load(fileHandle);
  } catch (e) {
    console.error(e);
  }
};

const newPlan = async () => {
  try {
    clearReopenFileUi();
    const options = fileOptions('myNewPlan.json');
    const fileHandle = await window.showSaveFilePicker(options);
    await permaplannerStore.resetToNewPlan();
    await permaplannerStore.save(fileHandle);
    onboarding.onboardingState = 'initial';
  } catch (e) {
    console.error(e);
  }
};

const save = async () => {
  try {
    const fileHandle =
      permaplannerStore.fileHandle ||
      (await window.showSaveFilePicker(fileOptions(permaplannerStore.fileName)));
    permaplannerStore.fileHandle = fileHandle;
    permaplannerStore.fileName = fileHandle.name;
    await permaplannerStore.save(fileHandle);
  } catch (e) {
    console.error(e);
  }
};

const saveAs = async () => {
  try {
    const options = fileOptions(permaplannerStore.fileName);
    const fileHandle = await window.showSaveFilePicker(options);
    await permaplannerStore.save(fileHandle);
  } catch (e) {
    console.error(e);
  }
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
        <ToolBarButton
          v-for="plant in garden.plants"
          :key="plant.id"
          :plant="plant"
          :active="garden.plant?.id === plant.id"
          :disabled="disabled"
          @click="garden.plant = plant"
        />
        <button
          class="p-1 rounded"
          :class="
            (garden.newGuild && ['bg-green-400 hover:bg-green-500']) || [
              'bg-green-200 hover:bg-green-300 disabled:opacity-50',
            ]
          "
          :disabled="disabled"
          @click.stop="garden.startDrawGuild"
        >
          Guild
        </button>
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
          v-for="guild in garden.guilds"
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

        <GardenFeature
          v-for="thing in garden.allGardenPlants"
          :key="thing.id"
          :thing="thing"
          :plant="garden.plantsById[thing.plantId] || garden.plantsById['default']"
          :active="garden.selectedId === thing.id || garden.hoveredId === thing.id"
          :scale="camera.scale"
          :unit-length-px="mapScale.unitLengthPx"
          @delete="garden.deleteFeature(thing.id)"
          @click="garden.selectedId = thing.id"
          @update="($event) => garden.updateFeature(thing.guildId, thing.id, $event)"
          @mouseenter="garden.hoveredId = thing.id"
          @mouseleave="garden.hoveredId = undefined"
        />

        <GardenGuild
          v-if="garden.newGuild"
          :guild="garden.newGuild"
          :unit-length-px="mapScale.unitLengthPx"
          hovered
          selected
          @update="addNewGuild"
          @cancel="garden.newGuild = undefined"
        />

        <GardenFeature
          v-if="newShape && garden.plant"
          :thing="newShape"
          :plant="garden.plant"
          active
          :scale="camera.scale"
          :unit-length-px="mapScale.unitLengthPx"
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
