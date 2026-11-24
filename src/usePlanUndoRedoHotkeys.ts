import { useEventListener } from '@vueuse/core';

import { isEditableTarget, isInDialog } from './keyboardShortcuts';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const usePlanUndoRedoHotkeys = () => {
  const history = usePlanCommandHistory();

  useEventListener(document, 'keydown', (e) => {
    if (!(e.metaKey || e.ctrlKey) || isInDialog(e.target)) return;
    const isSlider = e.target instanceof HTMLInputElement && e.target.type === 'range';
    if (isEditableTarget(e.target) && !isSlider) {
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
