import { v4 as uuid } from 'uuid';
import { landmarkFromPath } from './landmarkGeometry';
import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useGuildSelection } from './useGuildSelection';
import { useGardenStore } from './useGardenStore';
import { useLandmarkStore } from './useLandmarkStore';
import { usePlotBorderStore } from './usePlotBorderStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import type {
  AerialTool,
  DrawingBrush,
  MapFeature,
  DrawingSession,
  DrawingTarget,
} from './useAerialTool';
import type { Landmark } from './gardenDocument';
import type { GuildPath } from './guildPathClip';

type MapMode =
  | { kind: 'select' | 'move' }
  | ({ kind: 'draw' } & DrawingSession)
  | { kind: 'landmark'; id: string }
  | { kind: 'border' }
  | { kind: 'merge'; sourceId: string };

/** Route owns guild selection; this store owns every transient map interaction. */
export const useMapInteractionStore = defineStore('mapInteraction', () => {
  const guildSelection = useGuildSelection();
  const garden = useGardenStore();
  const landmarks = useLandmarkStore();
  const border = usePlotBorderStore();
  const session = useGardenSessionStore();
  const preferredFeature = ref<MapFeature>('guild');
  const preferredBrush = ref<DrawingBrush>('path');
  const mode = ref<MapMode>({ kind: 'select' });

  watch(
    guildSelection.selectedGuildId,
    (id) => {
      if (id) preferredFeature.value = 'guild';
      if (
        id ||
        (mode.value.kind === 'draw' && mode.value.target.feature === 'guild') ||
        mode.value.kind === 'move'
      ) {
        mode.value = { kind: 'select' };
      }
    },
    { flush: 'sync' },
  );
  watch(
    () => session.gardenId,
    () => {
      mode.value = { kind: 'select' };
    },
    { flush: 'sync' },
  );
  watch(
    () => {
      const current = mode.value;
      if (current.kind === 'merge')
        return garden.guilds.some((g) => g.id === current.sourceId);
      if (current.kind === 'landmark')
        return landmarks.landmarks.some((l) => l.id === current.id);
      if (current.kind === 'border') return border.path.length > 0;
      return true;
    },
    (exists) => {
      if (!exists) mode.value = { kind: 'select' };
    },
    { flush: 'sync' },
  );

  const selectedGuildId = computed(() => {
    const current = mode.value;
    if (
      current.kind === 'landmark' ||
      current.kind === 'border' ||
      (current.kind === 'draw' && current.target.feature !== 'guild')
    )
      return undefined;
    return guildSelection.selectedGuildId.value;
  });
  const selectedLandmark = computed(() => {
    const current = mode.value;
    return current.kind === 'landmark'
      ? landmarks.landmarks.find((l) => l.id === current.id)
      : undefined;
  });
  const isBorderSelected = computed(() => mode.value.kind === 'border');
  const mergeSourceId = computed(() =>
    mode.value.kind === 'merge' ? mode.value.sourceId : undefined,
  );
  const isMerging = computed(() => mode.value.kind === 'merge');
  const activeTool = computed<AerialTool>(() => {
    const current = mode.value;
    if (current.kind === 'draw' || current.kind === 'move') return current.kind;
    return 'select';
  });
  const canUseGuildTools = computed(() => selectedGuildId.value !== undefined);

  const clearSelection = () => {
    mode.value = { kind: 'select' };
    return guildSelection.clearSelection();
  };
  const resetMode = () => {
    mode.value = { kind: 'select' };
  };
  const toggleMerge = (sourceId: string) => {
    if (!garden.guilds.some((g) => g.id === sourceId)) return;
    mode.value =
      mergeSourceId.value === sourceId ? { kind: 'select' } : { kind: 'merge', sourceId };
  };
  const selectGuild = async (id: string) => {
    preferredFeature.value = 'guild';
    const target = garden.guilds.find((g) => g.id === id);
    if (!target) return;
    const source = garden.guilds.find((g) => g.id === mergeSourceId.value);
    if (source) {
      if (
        source.id === id ||
        !window.confirm(
          `Merge “${source.name}” with “${target.name}”? Their areas, plants, names, and notes will be combined. You can undo this merge.`,
        )
      )
        return;
      if (!garden.mergeGuilds(source.id, id)) return;
      id = source.id;
    }
    mode.value = { kind: 'select' };
    await guildSelection.selectGuild(id);
  };
  const addGuild = () => {
    preferredFeature.value = 'guild';
    mode.value = { kind: 'select' };
    return guildSelection.addGuild();
  };
  const selectLandmark = (id: string) => {
    preferredFeature.value = 'landmark';
    mode.value = { kind: 'landmark', id };
    void guildSelection.clearSelection();
  };
  const commitLandmark = (landmark: Landmark) => {
    landmarks.save(landmark);
    selectLandmark(landmark.id);
  };
  const selectBorder = () => {
    preferredFeature.value = 'border';
    mode.value = { kind: 'border' };
    void guildSelection.clearSelection();
  };
  const commitBorder = (points: GuildPath) => {
    if (border.savePath(points)) selectBorder();
  };
  const removeSelection = () => {
    if (isBorderSelected.value) border.savePath([]);
    else if (selectedLandmark.value) landmarks.remove(selectedLandmark.value.id);
    else if (selectedGuildId.value) {
      const id = selectedGuildId.value;
      garden.removeGuild(id);
      if (garden.guilds.some((g) => g.id === id)) return;
    }
    void clearSelection();
  };
  const drawing = computed(() => (mode.value.kind === 'draw' ? mode.value : undefined));
  const feature = computed(() => drawing.value?.target.feature ?? preferredFeature.value);
  const drawingBrush = computed(() => drawing.value?.brush ?? preferredBrush.value);
  const drawingPath = computed(() => {
    const target = drawing.value?.target;
    if (!target) return undefined;
    switch (target.feature) {
      case 'guild':
        return garden.guilds.find((guild) => guild.id === target.id)?.path;
      case 'border':
        return border.path;
      case 'landmark':
        return [];
    }
  });
  const startDrawing = (feature: MapFeature, brush: DrawingBrush) => {
    const id = guildSelection.selectedGuildId.value;
    let target: DrawingTarget;
    if (feature === 'guild') {
      if (!id) return;
      target = { feature, id };
    } else target = { feature };
    mode.value = { kind: 'draw', target, brush };
    if (feature !== 'guild') void guildSelection.clearSelection();
  };
  const setTool = (tool: AerialTool) => {
    if (tool === 'draw') startDrawing(feature.value, drawingBrush.value);
    else if (tool === 'move') {
      if (canUseGuildTools.value) mode.value = { kind: 'move' };
    } else if (!['landmark', 'border'].includes(mode.value.kind)) {
      mode.value = { kind: 'select' };
    }
  };
  const setFeature = (value: MapFeature) => {
    preferredFeature.value = value;
    startDrawing(value, drawingBrush.value);
  };
  const setBrush = (value: DrawingBrush) => {
    preferredBrush.value = value;
    startDrawing(feature.value, value);
  };
  const commitDrawing = (path: GuildPath): boolean => {
    const target = drawing.value?.target;
    if (!target) return false;
    switch (target.feature) {
      case 'guild':
        garden.setGuildPath(target.id, path);
        void clearSelection();
        return true;
      case 'landmark':
        if (!path.length) return false;
        commitLandmark(landmarkFromPath(uuid(), path));
        return true;
      case 'border':
        if (!path.length || !border.savePath(path)) return false;
        selectBorder();
        return true;
    }
  };

  return {
    drawing,
    drawingPath,
    commitDrawing,
    feature,
    drawingBrush,
    setFeature,
    setBrush,
    selectedGuildId,
    selectedLandmark,
    isBorderSelected,
    mergeSourceId,
    isMerging,
    activeTool,
    canUseGuildTools,
    clearSelection,
    resetMode,
    toggleMerge,
    selectGuild,
    addGuild,
    selectLandmark,
    commitLandmark,
    selectBorder,
    commitBorder,
    removeSelection,
    setTool,
  };
});
