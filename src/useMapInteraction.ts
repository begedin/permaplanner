import { computed, ref, watch } from 'vue';
import { useEventListener } from '@vueuse/core';
import { isEditableTarget } from './keyboardShortcuts';
import { useGuildSelection } from './useGuildSelection';
import { useGardenStore } from './useGardenStore';
import { useLandmarkStore } from './useLandmarkStore';
import { usePlotBorderStore } from './usePlotBorderStore';
import type { PathPoint } from './guildPathClip';
import { usePermaplannerStore } from './usePermaplannerStore';
import { useAerialToolHotkeys, type AerialTool } from './useAerialTool';
import type { Landmark } from './gardenDocument';

type MapSelection =
  | { kind: 'none' | 'border' }
  | { kind: 'guild' | 'landmark'; id: string };

export const useMapInteraction = () => {
  const guildSelection = useGuildSelection();
  const garden = useGardenStore();
  const landmarks = useLandmarkStore();
  const border = usePlotBorderStore();
  const plan = usePermaplannerStore();
  const selection = ref<MapSelection>({ kind: 'none' });
  const activeTool = ref<AerialTool>('select');

  watch(
    () => [guildSelection.selectedGuildId.value, plan.gardenId] as const,
    ([guildId], previous) => {
      if (guildId) {
        selection.value = { kind: 'guild', id: guildId };
        activeTool.value = 'select';
      } else if (
        !previous ||
        previous[1] !== plan.gardenId ||
        selection.value.kind === 'guild'
      ) {
        selection.value = { kind: 'none' };
        activeTool.value = 'select';
      }
    },
    { immediate: true, flush: 'sync' },
  );

  const selectedGuildId = computed(() =>
    selection.value.kind === 'guild' ? selection.value.id : undefined,
  );
  const selectedLandmark = computed(() => {
    const selected = selection.value;
    return selected.kind === 'landmark'
      ? landmarks.landmarks.find((item) => item.id === selected.id)
      : undefined;
  });
  const isBorderSelected = computed(
    () => selection.value.kind === 'border' && border.points.length > 0,
  );
  const canUseGuildTools = computed(() => selectedGuildId.value !== undefined);

  const clearSelection = () => {
    selection.value = { kind: 'none' };
    activeTool.value = 'select';
    void guildSelection.clearSelection();
  };
  const selectLandmark = (id: string) => {
    selection.value = { kind: 'landmark', id };
    activeTool.value = 'select';
    void guildSelection.clearSelection();
  };
  const commitLandmark = (landmark: Landmark) => {
    landmarks.save(landmark);
    selectLandmark(landmark.id);
  };
  const selectBorder = () => {
    selection.value = { kind: 'border' };
    activeTool.value = 'select';
    void guildSelection.clearSelection();
  };
  const commitBorder = (points: PathPoint[]) => {
    if (border.save(points)) selectBorder();
  };
  const removeSelection = () => {
    const selected = selection.value;
    if (selected.kind === 'border') {
      border.save([]);
      clearSelection();
    } else if (selected.kind === 'landmark') {
      landmarks.remove(selected.id);
      clearSelection();
    } else if (selected.kind === 'guild') {
      garden.removeGuild(selected.id);
      if (!garden.guilds.some((guild) => guild.id === selected.id)) clearSelection();
    }
  };
  const setTool = (tool: AerialTool) => {
    if ((tool === 'edit' || tool === 'move') && !canUseGuildTools.value) return;
    if (tool === 'border' && border.points.length) {
      selectBorder();
      return;
    }
    if (tool === 'landmark' || tool === 'border') {
      selection.value = { kind: 'none' };
      void guildSelection.clearSelection();
    }
    activeTool.value = tool;
  };

  useAerialToolHotkeys({ canUseGuildTools, setTool });
  useEventListener(document, 'keydown', (event) => {
    if (
      isEditableTarget(event.target) ||
      event.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    if (event.key === 'Delete') {
      event.preventDefault();
      removeSelection();
    } else if (event.key === 'Escape') {
      clearSelection();
    }
  });

  return {
    activeTool,
    setTool,
    selectedGuildId,
    selectedLandmark,
    isBorderSelected,
    selectBorder,
    commitBorder,
    canUseGuildTools,
    selectGuild: guildSelection.selectGuild,
    selectLandmark,
    commitLandmark,
    clearSelection,
    removeSelection,
  };
};
