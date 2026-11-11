import { v4 as uuid } from 'uuid';
import { shapeFromPath } from './mapShapeGeometry';
import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useGuildSelection } from './useGuildSelection';
import { useGardenStore } from './useGardenStore';
import { useMapShapeStore } from './useMapShapeStore';
import { SHAPE_FEATURES, type ShapeFeature } from './mapShapeFeatures';
import { usePlotBorderStore } from './usePlotBorderStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import type {
  AerialTool,
  DrawingBrush,
  MapFeature,
  DrawingSession,
  DrawingTarget,
} from './useAerialTool';
import type { MapShape } from './gardenDocument';
import type { GuildPath } from './guildPathClip';

type MapMode =
  | { kind: 'select' | 'move' }
  | ({ kind: 'draw' } & DrawingSession)
  | { kind: 'shape'; feature: ShapeFeature; id: string }
  | { kind: 'border' }
  | { kind: 'merge'; sourceId: string };

/** Route owns guild selection; this store owns every transient map interaction. */
export const useMapInteractionStore = defineStore('mapInteraction', () => {
  const guildSelection = useGuildSelection();
  const garden = useGardenStore();
  const shapes = useMapShapeStore();
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
      if (current.kind === 'shape')
        return shapes.items(current.feature).some((shape) => shape.id === current.id);
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
      current.kind === 'shape' ||
      current.kind === 'border' ||
      (current.kind === 'draw' && current.target.feature !== 'guild')
    )
      return undefined;
    return guildSelection.selectedGuildId.value;
  });
  const selectedShape = computed(() => {
    const current = mode.value;
    if (current.kind !== 'shape') return undefined;
    const shape = shapes.items(current.feature).find((item) => item.id === current.id);
    return shape ? { feature: current.feature, shape } : undefined;
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
  const selectShape = (feature: ShapeFeature, id: string) => {
    preferredFeature.value = feature;
    mode.value = { kind: 'shape', feature, id };
    void guildSelection.clearSelection();
  };
  const commitShape = (feature: ShapeFeature, shape: MapShape) => {
    shapes.save(feature, shape);
    selectShape(feature, shape.id);
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
    else if (selectedShape.value)
      shapes.remove(selectedShape.value.feature, selectedShape.value.shape.id);
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
      case 'path':
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
    } else if (!['shape', 'border'].includes(mode.value.kind)) {
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
      case 'path':
      case 'landmark':
        if (!path.length) return false;
        commitShape(
          target.feature,
          shapeFromPath(uuid(), SHAPE_FEATURES[target.feature].label, path),
        );
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
    selectedShape,
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
    selectShape,
    commitShape,
    selectBorder,
    commitBorder,
    removeSelection,
    setTool,
  };
});
