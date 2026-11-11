import { onScopeDispose } from 'vue';
import { storeToRefs } from 'pinia';
import { useEventListener } from '@vueuse/core';
import { isEditableTarget } from './keyboardShortcuts';
import { useAerialToolHotkeys } from './useAerialTool';
import { useMapInteractionStore } from './useMapInteractionStore';

/** Install map shortcuts only while the map is mounted. */
export const useMapInteraction = () => {
  const interaction = useMapInteractionStore();
  const refs = storeToRefs(interaction);
  onScopeDispose(interaction.resetMode);
  useAerialToolHotkeys({
    canUseGuildTools: refs.canUseGuildTools,
    setTool: interaction.setTool,
    setBrush: interaction.setBrush,
  });
  useEventListener(
    window,
    'keydown',
    (event) => {
      if (event.key === 'Escape' && interaction.isMerging) {
        event.preventDefault();
        interaction.resetMode();
        return;
      }
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
        interaction.removeSelection();
      } else if (event.key === 'Escape') {
        void interaction.clearSelection();
      }
    },
    { capture: true },
  );
  return {
    ...refs,
    commitDrawing: interaction.commitDrawing,
    setFeature: interaction.setFeature,
    selectGuild: interaction.selectGuild,
    selectLandmark: interaction.selectLandmark,
    commitLandmark: interaction.commitLandmark,
    selectBorder: interaction.selectBorder,
    commitBorder: interaction.commitBorder,
    clearSelection: interaction.clearSelection,
    removeSelection: interaction.removeSelection,
    setTool: interaction.setTool,
    setBrush: interaction.setBrush,
  };
};
