<script setup lang="ts">
  import DrawingOverlay from './DrawingOverlay.vue';
  import PlotBorderLayer from './PlotBorderLayer.vue';
  import { usePlotBorderStore } from './usePlotBorderStore';
  import { useMapShapeStore } from './useMapShapeStore';
  import MapShapeLayer from './MapShapeLayer.vue';
  import MapShapeEditor from './MapShapeEditor.vue';
  import { SCALE_UNITS } from './gardenDocument';
  import { computed, ref, toRef } from 'vue';

  import UiIcon from './uiIcons/UiIcon.vue';
  import ToolSlider from './ToolSlider.vue';
  import GardenGuild from './GardenGuild.vue';
  import { usePathDrawing } from './usePathDrawing';
  import { useGardenStore } from './useGardenStore';
  import { useCameraStore } from './useCameraStore';
  import { useMapScaleStore } from './useMapScaleStore';

  import { useBackgroundImagePaste } from './useBackgroundImagePaste';
  import { useLocalStorage } from '@vueuse/core';
  import OnboardingText from './OnboardingText.vue';
  import { useGuildHover } from './useGuildHover';
  import { useMapInteraction } from './useMapInteraction';
  import ReferenceLine from './ReferenceLine.vue';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import AerialMapToolbar from './AerialMapToolbar.vue';

  const props = defineProps<{
    svg: SVGSVGElement;
    worldBounds: { width: number; height: number };
    viewport: { width: number; height: number };
  }>();
  const container = toRef(props, 'svg');
  const plotBorder = usePlotBorderStore();
  const shapes = useMapShapeStore();
  const shapeLayerOrder = ['path', 'landmark'] as const;
  const session = useGardenSessionStore();
  const permaplannerStore = usePermaplannerStore();
  const mapSettingsOpen = ref(false);
  const showPlantLabels = useLocalStorage('permaplanner.showPlantLabels', false);
  const showGuildLabels = useLocalStorage('permaplanner.showGuildLabels', true);
  const showPathLabels = useLocalStorage('permaplanner.showPathLabels', true);
  const showLandmarkLabels = useLocalStorage('permaplanner.showLandmarkLabels', true);

  const shapeLabels = computed(() => ({
    landmark: showLandmarkLabels.value,
    path: showPathLabels.value,
  }));

  const imgDataUrl = computed(() => permaplannerStore.backgroundImageDataUrl);
  const { errorMessage: backgroundPasteError } = useBackgroundImagePaste();

  const shapeControls = ref<SVGGElement>();
  const camera = useCameraStore();

  const center = computed(() => {
    const x = camera.x / camera.scale;
    const y = camera.y / camera.scale;
    const width = props.viewport.width / camera.scale;
    const height = props.viewport.height / camera.scale;
    return { x: x + width / 2, y: y + height / 2 };
  });

  const mapScale = useMapScaleStore();

  const garden = useGardenStore();
  const { hoveredId, clearHover } = useGuildHover();
  const {
    selectedGuildId,
    selectedShape,
    isBorderSelected,
    selectBorder,
    commitBorder,
    selectGuild,
    selectShape,
    commitShape,
    clearSelection,
    removeSelection,
    activeTool,
    drawing,
    drawingPath,
    commitDrawing,
    feature,
    drawingBrush,
    setFeature,
    setBrush,
    setTool,
    canUseGuildTools,
  } = useMapInteraction();

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

  const editingGuildId = computed(() =>
    drawing.value?.target.feature === 'guild' ? drawing.value.target.id : undefined,
  );
  const {
    path: brushPath,
    corners,
    pointer,
    brush,
    stroke,
    brushColor,
    strokeColor,
  } = usePathDrawing({
    svg: container,
    savedPath: drawingPath,
    drawingBrush,
    onCommit: commitDrawing,
    onCancel: clearSelection,
  });
</script>
<template>
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
  <div
    class="pointer-events-none absolute top-2 right-2 z-10 flex w-max max-w-[calc(100%-1rem)] max-h-[calc(100%-1rem)] flex-col items-end gap-4"
  >
    <AerialMapToolbar
      :active-tool="activeTool"
      :feature="feature"
      :drawing-brush="drawingBrush"
      @update:feature="setFeature"
      @update:drawing-brush="setBrush"
      :can-use-guild-tools="canUseGuildTools"
      @update:active-tool="setTool"
    />
    <div
      v-if="drawing"
      class="paper-floating max-w-full px-3 py-2 text-sm text-ink-700"
    >
      <p v-if="drawingBrush === 'path'">
        Drag to paint. Hold Shift to lock an axis; ⌘ to subtract. +/− changes brush size.
      </p>
      <p v-else-if="drawingBrush === 'polygon'">
        Click to add corners. Backspace removes a corner; click the first corner to
        finish.
      </p>
      <p v-else>Drag to draw a bounding box.</p>
      <p>Enter saves; Escape cancels.</p>
    </div>
    <div
      v-else-if="isBorderSelected"
      class="paper-floating pointer-events-auto max-w-full px-3 py-2 text-sm"
    >
      <p>Drag corners to adjust the plot border.</p>
      <button
        type="button"
        class="btn-soft mt-2"
        @click="removeSelection"
      >
        Remove plot border
      </button>
    </div>
    <MapShapeEditor
      v-if="selectedShape"
      :shape="selectedShape.shape"
      :feature="selectedShape.feature"
      @update="commitShape(selectedShape.feature, $event)"
      @remove="removeSelection"
      @done="clearSelection"
    />
  </div>
  <Teleport :to="svg">
    <g>
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
      <text
        v-if="!imgDataUrl"
        :x="worldBounds.width / 2"
        :y="worldBounds.height / 2"
        fill="red"
        text-anchor="middle"
        dominant-baseline="middle"
        data-onboarding-text
      >
        Paste an aerial photo of your plot of land here. You can use Google Maps to take a
        screenshot
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
        :show-label="showGuildLabels"
        :show-plant-labels="showPlantLabels"
        :selected="selectedGuildId === guild.id"
        :tool="selectedGuildId === guild.id ? activeTool : undefined"
        :hovered="hoveredId === guild.id"
        :guild="guild"
        :unit-length-px="mapScale.unitLengthPx"
        @click.exact="selectGuild(guild.id)"
        @mouseenter="hoveredId = guild.id"
        @mouseleave="clearHover()"
        @move="garden.setGuildPath(guild.id, $event, true)"
        :preview-path="editingGuildId === guild.id ? brushPath : undefined"
      ></GardenGuild>

      <GardenGuild
        v-if="placementGuildDraft"
        :show-label="showGuildLabels"
        :show-plant-labels="showPlantLabels"
        :guild="placementGuildDraft"
        :unit-length-px="mapScale.unitLengthPx"
        :tool="activeTool"
        hovered
        selected
        :preview-path="editingGuildId ? brushPath : undefined"
      />

      <MapShapeLayer
        v-for="shapeFeature in shapeLayerOrder"
        :key="`${shapeFeature}-${session.gardenId}`"
        :shapes="shapes.items(shapeFeature)"
        :feature="shapeFeature"
        :show-labels="shapeLabels[shapeFeature]"
        :preview-path="drawing?.target.feature === shapeFeature ? brushPath : undefined"
        :controls-target="shapeControls"
        :selected-id="
          selectedShape?.feature === shapeFeature ? selectedShape.shape.id : undefined
        "
        :tool="activeTool"
        @select="selectShape(shapeFeature, $event)"
        @commit="commitShape(shapeFeature, $event)"
      />
      <PlotBorderLayer
        :key="session.gardenId"
        :path="plotBorder.path"
        :preview-path="drawing?.target.feature === 'border' ? brushPath : undefined"
        :selected="isBorderSelected"
        :tool="activeTool"
        @select="selectBorder"
        @commit="commitBorder"
      />
      <DrawingOverlay
        v-if="drawing"
        :width="worldBounds.width"
        :height="worldBounds.height"
        :stroke="stroke"
        :brush="brush"
        :corners="corners"
        :pointer="pointer"
        :drawing-brush="drawingBrush"
        :stroke-color="strokeColor"
        :brush-color="brushColor"
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
        ref="shapeControls"
        role="group"
        aria-label="Shape controls"
      />
    </g>
  </Teleport>
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
          <fieldset class="flex flex-col gap-2 border-b border-parchment-300 pb-3">
            <legend class="mb-2 font-serif font-medium text-ink-800">Map labels</legend>
            <label class="flex cursor-pointer items-center gap-2 text-ink-700">
              <input
                v-model="showPlantLabels"
                type="checkbox"
                class="size-4 accent-sage-800"
              />
              Plant names (maximum zoom)
            </label>
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
            <label class="flex cursor-pointer items-center gap-2 text-ink-700">
              <input
                v-model="showPathLabels"
                type="checkbox"
                class="size-4 accent-sage-800"
              />
              Path names
            </label>
          </fieldset>
          <label class="paper-field-label"
            >Scale unit
            <select
              class="input-soft w-full px-2 py-1.5 font-normal text-ink-800"
              :value="mapScale.unit"
              @change="mapScale.setUnit(($event.target as HTMLSelectElement).value)"
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

  @media (prefers-reduced-motion: reduce) {
    .map-settings-panel,
    .map-settings-content {
      transition: none;
    }
  }
</style>
