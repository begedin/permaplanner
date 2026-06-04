import { ref } from 'vue';

import type { PlanSavableState } from './planSavableState';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const usePlanEditSession = () => {
  const history = usePlanCommandHistory();
  const editBefore = ref<PlanSavableState | null>(null);

  const begin = () => {
    editBefore.value = history.capturePlanSavableState();
  };

  const commit = () => {
    const before = editBefore.value;
    editBefore.value = null;
    if (!before) {
      return;
    }
    history.commitSnapshot(before);
  };

  const cancel = () => {
    editBefore.value = null;
  };

  return { begin, commit, cancel };
};
