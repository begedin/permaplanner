import { ref, type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { isEditableTarget } from './keyboardShortcuts';

export type AerialTool = 'select' | 'edit' | 'move';

const activeTool = ref<AerialTool>('select');

export const useAerialTool = () => {
  const setTool = (tool: AerialTool) => {
    activeTool.value = tool;
  };

  const resetTool = () => {
    activeTool.value = 'select';
  };

  return { activeTool, setTool, resetTool };
};

export const useAerialToolHotkeys = (options: {
  canUseGuildTools: Ref<boolean>;
  setTool: (tool: AerialTool) => void;
}) => {
  useEventListener(document, 'keydown', (e) => {
    if (isEditableTarget(e.target)) {
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) {
      return;
    }

    const key = e.key.toLowerCase();
    if (key === 'v') {
      e.preventDefault();
      options.setTool('select');
      return;
    }
    if (key === 'b' && options.canUseGuildTools.value) {
      e.preventDefault();
      options.setTool('edit');
      return;
    }
    if (key === 'm' && options.canUseGuildTools.value) {
      e.preventDefault();
      options.setTool('move');
    }
  });
};
