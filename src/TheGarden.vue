<script setup lang="ts">
  import { guildPathData } from './guildPathClip';
  import PlotBorderLayer from './PlotBorderLayer.vue';
  import { usePlotBorderStore } from './usePlotBorderStore';
  import LandmarkLayer from './LandmarkLayer.vue';
  import LandmarkEditor from './LandmarkEditor.vue';
  import { useLandmarkStore } from './useLandmarkStore';
  import { SCALE_UNITS } from './gardenDocument';
  import { computed, onBeforeUnmount, ref, watch } from 'vue';

  import UiIcon from './uiIcons/UiIcon.vue';
  import ToolSlider from './ToolSlider.vue';
  import GuildEditor from './GuildEditor.vue';
  import GardenGuild from './GardenGuild.vue';
  import { useGuildPathEdit } from './useGuildPathEdit';
  import { useGardenStore } from './useGardenStore';
  import { useCameraStore } from './useCameraStore';
  import { useMapScaleStore } from './useMapScaleStore';

  import { useBackgroundImage } from './useBackgroundImage';
  import { useBackgroundImagePaste } from './useBackgroundImagePaste';
  import { useCamera } from './useCamera';
  import { useElementSize, useLocalStorage } from '@vueuse/core';
  import GuildTabHeader from './GuildTabHeader.vue';
  import OnboardingText from './OnboardingText.vue';
  import GuildListRow from './GuildListRow.vue';
  import { useGuildHover } from './useGuildHover';
  import { useGuildSearch } from './useGuildSearch';
  import { useGuildListScroll } from './useGuildListScroll';
  import { useMapInteraction } from './useMapInteraction';
  import ReferenceLine from './ReferenceLine.vue';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import AerialMapToolbar from './AerialMapToolbar.vue';

  const plotBorder = usePlotBorderStore();
  const landmarks = useLandmarkStore();
  const session = useGardenSessionStore();
  const permaplannerStore = usePermaplannerStore();
  const mapSettingsOpen = ref(false);
  const showGuildLabels = useLocalStorage('permaplanner.showGuildLabels', true);
  const showLandmarkLabels = useLocalStorage('permaplanner.showLandmarkLabels', true);

  const { imgWidth, imgHeight, imgDataUrl, ready } = useBackgroundImage();
  const { errorMessage: backgroundPasteError } = useBackgroundImagePaste();

  const container = ref<SVGSVGElement>();
  const landmarkControls = ref<SVGGElement>();

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

  const { setupCamera, teardownCamera, fitToViewPort } = useCamera(
    container,
    cameraParams,
  );

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

  const mapScale = useMapScaleStore();

  const garden = useGardenStore();
  const { hoveredId, clearHover } = useGuildHover();
  const {
    isMerging,
    selectedGuildId,
    selectedLandmark,
    isBorderSelected,
    selectBorder,
    commitBorder,
    selectGuild,
    selectLandmark,
    commitLandmark,
    clearSelection,
    removeSelection,
    activeTool,
    setTool,
    canUseGuildTools,
  } = useMapInteraction();
  const { searchQuery, filteredGuilds, hasSearchQuery } = useGuildSearch();
  const { guildListScroll } = useGuildListScroll();

  /** Selected guild is drawn first so other beds stay clickable on top while editing. */
  const placedGuildsRenderOrder = computed(() => {
    const placed = garden.guilds.filter((g) => g.path.length > 0);
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

  const editingGuild = computed(() =>
    activeTool.value === 'edit'
      ? garden.guilds.find((guild) => guild.id === selectedGuildId.value)
      : undefined,
  );
  const {
    path: brushPath,
    brush,
    stroke,
    brushColor,
    strokeColor,
  } = useGuildPathEdit({
    svg: container,
    guild: editingGuild,
    onCommit: (id, path) => {
      garden.setGuildPath(id, path);
      clearSelection();
    },
    onCancel: clearSelection,
  });
</script>

<template>
  <div
    class="flex flex-col h-full min-h-0 bg-parchment-100/50"
    :class="{ 'guild-merge-mode': isMerging }"
  >
    <GuildTabHeader v-model:search-query="searchQuery" />

    <div class="flex flex-col md:flex-row flex-1 min-h-0 min-w-0">
      <aside
        class="flex flex-col min-h-0 min-w-0 max-h-40 md:max-h-none md:w-72 md:shrink-0 border-r border-parchment-400/60 paper-surface"
        aria-label="Guild list"
      >
        <div
          v-if="garden.guilds.length === 0"
          class="p-4 text-ink-600 text-sm"
        >
          No guilds yet. Click <strong>Add guild</strong> to create one.
        </div>
        <div
          v-else-if="filteredGuilds.length === 0 && hasSearchQuery"
          class="p-4 text-ink-600 text-sm"
        >
          No guilds match “{{ searchQuery.trim() }}”.
        </div>
        <div
          v-else
          ref="guildListScroll"
          class="guild-list flex-1 min-h-0 overflow-x-hidden overflow-y-auto p-2 flex flex-col gap-2"
        >
          <GuildListRow
            v-for="guild in filteredGuilds"
            :guild-id="guild.id"
            :key="guild.id"
          />
        </div>
      </aside>
      <div
        class="guild-workspace grid flex-1 min-h-0 min-w-0"
        :class="{ 'guild-workspace--selected': selectedGuildId }"
      >
        <section
          class="min-h-0 min-w-0 overflow-hidden paper-surface"
          :aria-hidden="!selectedGuildId"
          :inert="!selectedGuildId"
          aria-label="Guild details"
        >
          <div
            class="flex h-full min-h-0 min-w-0 flex-col border-r border-parchment-400/60 p-2"
          >
            <GuildEditor
              v-if="selectedGuildId"
              :key="selectedGuildId"
              :guild-id="selectedGuildId"
              class="flex-1 min-h-0"
            />
          </div>
        </section>

        <section
          class="relative flex flex-1 min-h-0 min-w-0 flex-col"
          aria-label="Aerial map"
        >
          <div
            v-if="backgroundPasteError"
            role="alert"
            aria-label="Background image not added"
            class="absolute bottom-16 left-4 right-4 z-20 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900 shadow-lg"
          >
            <p class="flex-1">{{ backgroundPasteError }}</p>
            <button
              type="button"
              class="btn-icon flex size-7 shrink-0 items-center justify-center hover:bg-red-100"
              aria-label="Dismiss background image error"
              @click="backgroundPasteError = undefined"
            >
              ×
            </button>
          </div>
          <div class="pointer-events-none absolute top-2 right-2 z-10">
            <AerialMapToolbar
              :active-tool="activeTool"
              :can-use-guild-tools="canUseGuildTools"
              @update:active-tool="setTool"
            />
          </div>
          <p
            v-if="activeTool === 'landmark'"
            class="paper-floating pointer-events-none absolute top-16 right-2 z-10 max-w-[calc(100%-1rem)] px-3 py-2 text-sm text-ink-700"
          >
            Drag to draw a landmark rectangle. Escape cancels.
          </p>
          <div
            v-if="activeTool === 'border' || isBorderSelected"
            class="paper-floating absolute top-16 right-2 z-10 max-w-[calc(100%-1rem)] px-3 py-2 text-sm text-ink-700"
          >
            <p v-if="plotBorder.points.length">
              Drag corners to adjust the plot border. Escape finishes editing.
            </p>
            <p v-else>
              Click to add corners. Click the first corner or press Enter to close.
              Backspace removes a corner; Escape cancels.
            </p>
            <button
              v-if="plotBorder.points.length"
              type="button"
              class="btn-soft mt-2"
              @click="removeSelection"
            >
              Remove plot border
            </button>
          </div>
          <LandmarkEditor
            :landmark="selectedLandmark"
            @update="commitLandmark"
            @remove="removeSelection"
            @done="clearSelection"
          />
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
            <path
              v-if="editingGuild"
              :d="guildPathData(stroke.length ? stroke : [[brush]])"
              fill-rule="evenodd"
              :fill="stroke.length ? strokeColor : brushColor"
              class="pointer-events-none"
              data-guild-brush
            />
            <GardenGuild
              v-for="guild in placedGuildsRenderOrder"
              :key="guild.id"
              :show-label="showGuildLabels"
              :selected="selectedGuildId === guild.id"
              :tool="selectedGuildId === guild.id ? activeTool : undefined"
              :hovered="hoveredId === guild.id"
              :guild="guild"
              :unit-length-px="mapScale.unitLengthPx"
              @click.exact="selectGuild(guild.id)"
              @mouseenter="hoveredId = guild.id"
              @mouseleave="clearHover()"
              @move="garden.setGuildPath(guild.id, $event)"
              :preview-path="editingGuild?.id === guild.id ? brushPath : undefined"
            ></GardenGuild>

            <GardenGuild
              v-if="placementGuildDraft"
              :show-label="showGuildLabels"
              :guild="placementGuildDraft"
              :unit-length-px="mapScale.unitLengthPx"
              :tool="activeTool"
              hovered
              selected
              :preview-path="editingGuild ? brushPath : undefined"
            />

            <LandmarkLayer
              :landmarks="landmarks.landmarks"
              :controls-target="landmarkControls"
              :selected-id="selectedLandmark?.id"
              :tool="activeTool"
              @select="selectLandmark"
              @commit="commitLandmark"
              :show-labels="showLandmarkLabels"
              :width="worldBounds.width"
              :height="worldBounds.height"
            />
            <PlotBorderLayer
              :key="session.gardenId"
              :points="plotBorder.points"
              :selected="isBorderSelected"
              :tool="activeTool"
              :width="worldBounds.width"
              :height="worldBounds.height"
              @select="selectBorder"
              @commit="commitBorder"
            />
            <ReferenceLine v-slot="{ onboardingState }">
              <OnboardingText
                v-if="imgDataUrl"
                :x="center.x"
                :y="center.y"
                :onboarding-state="onboardingState"
              />
            </ReferenceLine>
            <g
              ref="landmarkControls"
              role="group"
              aria-label="Landmark controls"
            />
          </svg>
          <div
            class="map-settings-panel paper-floating absolute bottom-2 right-2 z-10 flex max-w-[calc(100%-1rem)] flex-col p-1.5 text-sm"
            :class="{ 'map-settings-panel--open': mapSettingsOpen }"
            role="group"
            aria-label="Map settings"
          >
            <div
              id="map-settings-controls"
              class="map-settings-content"
              :aria-hidden="!mapSettingsOpen"
              :inert="!mapSettingsOpen"
            >
              <div class="min-h-0 overflow-hidden">
                <div class="flex flex-col gap-3 p-3">
                  <fieldset
                    class="flex flex-col gap-2 border-b border-parchment-300 pb-3"
                  >
                    <legend class="mb-2 font-serif font-medium text-ink-800">
                      Map labels
                    </legend>
                    <label class="flex cursor-pointer items-center gap-2 text-ink-700">
                      <input
                        v-model="showGuildLabels"
                        type="checkbox"
                        class="size-4 accent-sage-800"
                      />
                      Guild names
                    </label>
                    <label class="flex cursor-pointer items-center gap-2 text-ink-700">
                      <input
                        v-model="showLandmarkLabels"
                        type="checkbox"
                        class="size-4 accent-sage-800"
                      />
                      Landmark names
                    </label>
                  </fieldset>
                  <label class="paper-field-label"
                    >Scale unit
                    <select
                      class="input-soft w-full px-2 py-1.5 font-normal text-ink-800"
                      :value="mapScale.unit"
                      @change="
                        mapScale.setUnit(($event.target as HTMLSelectElement).value)
                      "
                    >
                      <option
                        v-for="unit in SCALE_UNITS"
                        :key="unit.value"
                        :value="unit.value"
                      >
                        {{ unit.label }}
                      </option>
                    </select>
                  </label>
                  <p class="text-xs leading-relaxed text-ink-600">
                    Choose the unit for the reference line’s length.
                  </p>
                  <ToolSlider
                    :value="mapScale.linePhysicalLength"
                    label="Map scale"
                    :min="1"
                    :max="300"
                    :step="1"
                    @update:value="mapScale.setPhysicalLength"
                  />
                  <ToolSlider
                    :value="permaplannerStore.backgroundOpacity"
                    label="BG opacity"
                    :min="0"
                    :max="1"
                    :step="0.01"
                    @update:value="permaplannerStore.setBackgroundOpacity"
                  />
                </div>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-1 rounded px-2 py-1 text-ink-700 hover:bg-sage-200/75"
              :aria-expanded="mapSettingsOpen"
              aria-controls="map-settings-controls"
              @click="mapSettingsOpen = !mapSettingsOpen"
            >
              <UiIcon
                name="guilds"
                class="size-5"
              />
              <span>Map settings</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .map-settings-panel {
    width: 10rem;
    transition: width 250ms ease-in-out;
  }

  .map-settings-panel--open {
    width: 15rem;
  }

  .map-settings-content {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    transition:
      grid-template-rows 250ms ease-in-out,
      opacity 250ms ease-in-out;
  }

  .map-settings-panel--open .map-settings-content {
    grid-template-rows: 1fr;
    opacity: 1;
  }

  .guild-workspace {
    grid-template-rows: minmax(0, 0fr) minmax(0, 1fr);
    transition:
      grid-template-columns 300ms ease-in-out,
      grid-template-rows 300ms ease-in-out;
  }

  .guild-workspace--selected {
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
  }

  @media (min-width: 768px) {
    .guild-workspace {
      grid-template-rows: minmax(0, 1fr);
      grid-template-columns: minmax(0, 0fr) minmax(0, 5fr);
    }

    .guild-workspace--selected {
      grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .guild-workspace,
    .map-settings-panel,
    .map-settings-content {
      transition: none;
    }
  }
</style>
