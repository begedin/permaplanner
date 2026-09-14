import { capturePlanSavableState, type PlanSavableState } from './planSavableState';
import { usePlanCommandHistory } from './usePlanCommandHistory';

export const usePlanEditSession = () => {
  const history = usePlanCommandHistory();
  let editBefore: PlanSavableState | null = null;

  const begin = () => {
    editBefore = capturePlanSavableState();
  };

  const commit = () => {
    const before = editBefore;
    editBefore = null;
    if (!before) {
      return;
    }
    history.commitSnapshot(before);
  };

  const cancel = () => {
    editBefore = null;
  };

  return { begin, commit, cancel };
};
