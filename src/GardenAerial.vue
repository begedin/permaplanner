<script setup lang="ts">
  import DrawingOverlay from './DrawingOverlay.vue';
  import PlotBorderLayer from './PlotBorderLayer.vue';
  import { usePlotBorderStore } from './usePlotBorderStore';
  import { useMapShapeStore } from './useMapShapeStore';
  import MapShapeLayer from './MapShapeLayer.vue';
  import MapShapeEditor from './MapShapeEditor.vue';
  import { SCALE_UNITS } from './gardenDocument';
  import { computed, ref, toRef } from 'vue';

  import MapSettings from './MapSettings.vue';
  import ToolSlider from './ToolSlider.vue';
  import GardenGuild from './GardenGuild.vue';
  import { usePathDrawing } from './usePathDrawing';
  import { useGardenStore } from './useGardenStore';
  import { useCameraStore } from './useCameraStore';
  import { useMapScaleStore } from './useMapScaleStore';
  import { useOnboardingStore } from './useOnboardingStore';

  import { useBackgroundImagePaste } from './useBackgroundImagePaste';
  import { useLocalStorage } from '@vueuse/core';
  import OnboardingText from './OnboardingText.vue';
  import { useGuildHover } from './useGuildHover';
  import { useMapInteraction } from './useMapInteraction';
  import ReferenceLine from './ReferenceLine.vue';
  import { useGardenSessionStore } from './stores/useGardenSessionStore';
  import { usePermaplannerStore } from './usePermaplannerStore';
  import AerialMapToolbar from './AerialMapToolbar.vue';

  import { useAerialMapBounds } from './aerialMapBounds';
  import RecoverMapFeatures from './RecoverMapFeatures.vue';

  const worldBounds = useAerialMapBounds();
  const props = defineProps<{
    svg: SVGSVGElement;
  }>();
  const container = toRef(props, 'svg');
  const plotBorder = usePlotBorderStore();
  const shapes = useMapShapeStore();
  const shapeLayerOrder = ['path', 'landmark'] as const;
  const session = useGardenSessionStore();
  const permaplannerStore = usePermaplannerStore();
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
  const shapeResizeControls = ref<SVGGElement>();
  const detailsToolbar = ref<HTMLElement>();
  const guildLabelLayer = ref<SVGGElement>();
  const camera = useCameraStore();

  const mapScale = useMapScaleStore();
  const onboarding = useOnboardingStore();

  const garden = useGardenStore();
  const { hoveredId, clearHover } = useGuildHover();
  const {
    selectedGuildId,
    selectedPlantId,
    isMerging,
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
    worldBounds,
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
    class="pointer-events-none absolute top-2 right-2 z-10 flex w-max max-w-[calc(100%-1rem)] max-h-[calc(100%-3.75rem)] flex-col items-end gap-4"
  >
    <p
      v-if="!worldBounds"
      role="status"
      class="paper-floating max-w-full px-3 py-2 text-sm text-ink-700"
    >
      Map editing needs the photo dimensions. You can paste a replacement photo.
    </p>
    <div
      v-else-if="drawing"
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
      :key="`${selectedShape.feature}-${selectedShape.shape.id}`"
      :shape="selectedShape.shape"
      :feature="selectedShape.feature"
      :toolbar-target="detailsToolbar"
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
        v-if="!imgDataUrl && worldBounds"
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
        v-if="mapScale.unitLengthPx && worldBounds"
        x="0"
        y="0"
        :width="worldBounds.width"
        :height="worldBounds.height"
        fill="url(#grid)"
        class="pointer-events-none"
      />
      <g ref="shapeResizeControls" />
      <GardenGuild
        v-for="guild in placedGuildsRenderOrder"
        :key="guild.id"
        :show-label="showGuildLabels"
        :show-plant-labels="showPlantLabels"
        :label-layer="guildLabelLayer"
        :selected="selectedGuildId === guild.id"
        :selected-plant-id="selectedGuildId === guild.id ? selectedPlantId : undefined"
        :select-plants="activeTool === 'select' && !isMerging"
        :tool="selectedGuildId === guild.id ? activeTool : undefined"
        :hovered="hoveredId === guild.id"
        :guild="guild"
        :preview-path="editingGuildId === guild.id ? brushPath : undefined"
        @click.exact="selectGuild(guild.id)"
        @select-plant="selectGuild(guild.id, $event)"
        @mouseenter="hoveredId = guild.id"
        @mouseleave="clearHover()"
        @move="garden.setGuildPath(guild.id, $event, true)"
      ></GardenGuild>

      <GardenGuild
        v-if="placementGuildDraft"
        :show-label="showGuildLabels"
        :show-plant-labels="showPlantLabels"
        :label-layer="guildLabelLayer"
        :guild="placementGuildDraft"
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
        :resize-target="shapeResizeControls"
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
        v-if="drawing && worldBounds"
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
          v-if="imgDataUrl && worldBounds"
          v-bind="camera.center"
          :onboarding-state="onboardingState"
        />
      </ReferenceLine>
      <g
        ref="guildLabelLayer"
        class="pointer-events-none"
      />
      <g
        ref="shapeControls"
        role="group"
        aria-label="Shape controls"
      />
    </g>
  </Teleport>
  <MapSettings>
    <template #tools>
      <AerialMapToolbar
        v-if="worldBounds"
        :active-tool="activeTool"
        :feature="feature"
        :drawing-brush="drawingBrush"
        :can-use-guild-tools="canUseGuildTools"
        @update:feature="setFeature"
        @update:drawing-brush="setBrush"
        @update:active-tool="setTool"
      />
      <div
        ref="detailsToolbar"
        class="contents"
      />
    </template>
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 font-serif font-medium text-ink-800">Labels</legend>
      <label class="flex cursor-pointer items-center gap-2 text-ink-700">
        <input
          v-model="showPlantLabels"
          type="checkbox"
          class="size-4 accent-sage-800"
        />
        Plants (max. zoom)
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-ink-700">
        <input
          v-model="showGuildLabels"
          type="checkbox"
          class="size-4 accent-sage-800"
        />
        Guilds
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-ink-700">
        <input
          v-model="showLandmarkLabels"
          type="checkbox"
          class="size-4 accent-sage-800"
        />
        Landmarks
      </label>
      <label class="flex cursor-pointer items-center gap-2 text-ink-700">
        <input
          v-model="showPathLabels"
          type="checkbox"
          class="size-4 accent-sage-800"
        />
        Paths
      </label>
    </fieldset>
    <ToolSlider
      :value="permaplannerStore.backgroundOpacity"
      label="BG opacity"
      :min="0"
      :max="1"
      :step="0.01"
      @update:value="permaplannerStore.setBackgroundOpacity"
    />
    <hr class="border-parchment-300" />
    <fieldset class="flex flex-col gap-2">
      <legend class="mb-2 font-serif font-medium text-ink-800">Scale</legend>
      <ToolSlider
        :value="mapScale.linePhysicalLength"
        label="Reference line length"
        :min="1"
        :max="300"
        :step="1"
        @update:value="mapScale.setPhysicalLength"
      />
      <label class="paper-field-label"
        >Unit
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
      <button
        v-if="
          onboarding.onboardingState !== 'done' &&
          mapScale.unit !== 'unspecified' &&
          mapScale.unitLengthPx > 0
        "
        type="button"
        class="btn-soft self-start"
        @click="onboarding.setOnboardingState('done')"
      >
        Confirm scale · {{ mapScale.linePhysicalLength }} {{ mapScale.unit }}
      </button>
    </fieldset>
    <hr class="border-parchment-300" />
    <RecoverMapFeatures />
  </MapSettings>
</template>
