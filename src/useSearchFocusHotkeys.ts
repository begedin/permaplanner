import { useEventListener } from '@vueuse/core';
import type { Ref } from 'vue';

export const useSearchFocusHotkeys = (
  inputRef: Ref<HTMLInputElement | null>,
  enabled: () => boolean,
) => {
  const focusSearch = () => {
    inputRef.value?.focus();
    inputRef.value?.select();
  };

  useEventListener(document, 'keydown', (e) => {
    if (!enabled()) {
      return;
    }

    const modFind = (e.metaKey || e.ctrlKey) && e.key === 'f';
    const slash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
    if (!modFind && !slash) {
      return;
    }

    if (slash) {
      const active = document.activeElement;
      if (active instanceof HTMLElement) {
        const tag = active.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          active.isContentEditable
        ) {
          return;
        }
      }
    }

    e.preventDefault();
    focusSearch();
  });

  return { focusSearch };
};
