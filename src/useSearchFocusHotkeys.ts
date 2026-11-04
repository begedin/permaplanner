import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';
import { isEditableTarget } from './keyboardShortcuts';

export const useSearchFocusHotkeys = (inputRef: Ref<HTMLInputElement | null>) => {
  useEventListener(document, 'keydown', (e) => {
    const modFind = (e.metaKey || e.ctrlKey) && e.key === 'f';
    const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (!modFind && !slash) {
      return;
    }

    if (slash && isEditableTarget(document.activeElement)) return;

    e.preventDefault();
    inputRef.value?.focus();
    inputRef.value?.select();
  });
};
