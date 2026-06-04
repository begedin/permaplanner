import { useEventListener } from '@vueuse/core';

import { usePlanCommandHistory } from './usePlanCommandHistory';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

export const usePlanUndoRedoHotkeys = () => {
  const history = usePlanCommandHistory();

  useEventListener(document, 'keydown', (e) => {
    if (isEditableTarget(e.target)) {
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
