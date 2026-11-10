import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useGuildSelection } from './useGuildSelection';
import { useGardenStore } from './useGardenStore';
import { useLandmarkStore } from './useLandmarkStore';
import { usePlotBorderStore } from './usePlotBorderStore';
import { useGardenSessionStore } from './stores/useGardenSessionStore';
import type { AerialTool } from './useAerialTool';
import type { Landmark } from './gardenDocument';
import type { PathPoint } from './guildPathClip';

type MapMode =
  | { kind: 'select' | 'edit' | 'move' }
  | { kind: 'draw'; tool: 'landmark' | 'border' }
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
  const mode = ref<MapMode>({ kind: 'select' });

  watch(
    guildSelection.selectedGuildId,
    (id) => {
      if (id || mode.value.kind === 'edit' || mode.value.kind === 'move') {
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
      if (current.kind === 'border') return border.points.length > 0;
      return true;
    },
    (exists) => {
      if (!exists) mode.value = { kind: 'select' };
    },
    { flush: 'sync' },
  );

  const selectedGuildId = computed(() =>
    ['select', 'edit', 'move', 'merge'].includes(mode.value.kind)
      ? guildSelection.selectedGuildId.value
      : undefined,
  );
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
    if (current.kind === 'draw') return current.tool;
    if (current.kind === 'edit' || current.kind === 'move') return current.kind;
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
    mode.value = { kind: 'select' };
    return guildSelection.addGuild();
  };
  const selectLandmark = (id: string) => {
    mode.value = { kind: 'landmark', id };
    void guildSelection.clearSelection();
  };
  const commitLandmark = (landmark: Landmark) => {
    landmarks.save(landmark);
    selectLandmark(landmark.id);
  };
  const selectBorder = () => {
    mode.value = { kind: 'border' };
    void guildSelection.clearSelection();
  };
  const commitBorder = (points: PathPoint[]) => {
    if (border.save(points)) selectBorder();
  };
  const removeSelection = () => {
    if (isBorderSelected.value) border.save([]);
    else if (selectedLandmark.value) landmarks.remove(selectedLandmark.value.id);
    else if (selectedGuildId.value) {
      const id = selectedGuildId.value;
      garden.removeGuild(id);
      if (garden.guilds.some((g) => g.id === id)) return;
    }
    void clearSelection();
  };
  const setTool = (tool: AerialTool) => {
    if ((tool === 'edit' || tool === 'move') && !canUseGuildTools.value) return;
    if (tool === 'border' && border.points.length) {
      selectBorder();
      return;
    }
    if (tool === 'landmark' || tool === 'border') {
      mode.value = { kind: 'draw', tool };
      void guildSelection.clearSelection();
    } else if (tool !== 'select' || !['landmark', 'border'].includes(mode.value.kind)) {
      mode.value = { kind: tool };
    }
  };

  return {
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
