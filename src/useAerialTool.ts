import { ref, type Ref } from 'vue';
import { useEventListener } from '@vueuse/core';

export type AerialTool = 'select' | 'edit' | 'move';

const activeTool = ref<AerialTool>('select');

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

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
  enabled: Ref<boolean>;
  canUseEdit: Ref<boolean>;
  canUseMove: Ref<boolean>;
  setTool: (tool: AerialTool) => void;
}) => {
  useEventListener(document, 'keydown', (e) => {
    if (!options.enabled.value || isEditableTarget(e.target)) {
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
    if (key === 'b' && options.canUseEdit.value) {
      e.preventDefault();
      options.setTool('edit');
      return;
    }
    if (key === 'm' && options.canUseMove.value) {
      e.preventDefault();
      options.setTool('move');
    }
  });
};
