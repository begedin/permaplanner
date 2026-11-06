import type { Ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { isEditableTarget } from './keyboardShortcuts';

export type AerialTool = 'select' | 'edit' | 'move' | 'landmark';

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
    if (key === 'r') {
      e.preventDefault();
      options.setTool('landmark');
      return;
    }
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
