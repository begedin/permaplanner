import { useEventListener } from '@vueuse/core';

import { isEditableTarget } from './keyboardShortcuts';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const usePlanUndoRedoHotkeys = () => {
  const history = usePlanCommandHistory();

  useEventListener(document, 'keydown', (e) => {
    const isSlider = e.target instanceof HTMLInputElement && e.target.type === 'range';
    if (isEditableTarget(e.target) && !isSlider) {
      return;
    }
    const mod = e.metaKey || e.ctrlKey;
    if (!mod) {
      return;
    }
    if (e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      history.undo();
      return;
    }
    if (e.key === 'z' && e.shiftKey) {
      e.preventDefault();
      history.redo();
      return;
    }
    if (e.key === 'y') {
      e.preventDefault();
      history.redo();
    }
  });
};
