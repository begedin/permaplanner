import { defineStore } from 'pinia';
import { computed, shallowRef, type ShallowRef } from 'vue';

import { planSavableStatesEqual, type PlanSavableState } from './planSavableState';
import { usePlanStateStore } from './usePlanStateStore';

type PlanEdit = { before: PlanSavableState; after: PlanSavableState };

export const usePlanCommandHistory = defineStore('planCommandHistory', () => {
  const plan = usePlanStateStore();
  const undoStack = shallowRef<PlanEdit[]>([]);
  const redoStack = shallowRef<PlanEdit[]>([]);

  /** While applying undo/redo, nested mutations must not record new commands. */
  let applyingDepth = 0;
  let mergeCandidate: { token: symbol; edit: PlanEdit } | undefined;

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const commitSnapshot = (before: PlanSavableState, token?: symbol) => {
    if (applyingDepth > 0 || plan.isBulkPlanUpdate) return;
    const after = plan.capture();
    const previous = mergeCandidate;
    mergeCandidate = undefined;
    const canMerge =
      token !== undefined &&
      previous?.token === token &&
      planSavableStatesEqual(before, previous.edit.after);
    if (planSavableStatesEqual(before, after)) {
      if (canMerge) mergeCandidate = previous;
      return;
    }
    const edit = { before: canMerge ? previous.edit.before : before, after };
    const stack = canMerge ? undoStack.value.slice(0, -1) : undoStack.value;
    if (planSavableStatesEqual(edit.before, edit.after)) {
      undoStack.value = stack;
    } else {
      undoStack.value = [...stack, edit];
      if (token !== undefined) mergeCandidate = { token, edit };
    }
    redoStack.value = [];
  };

  const runMutation = (mutate: () => void, token?: symbol) => {
    if (applyingDepth > 0 || plan.isBulkPlanUpdate) {
      mutate();
      return;
    }
    const before = plan.capture();
    mutate();
    commitSnapshot(before, token);
  };

  const replayEdit = (
    source: ShallowRef<PlanEdit[]>,
    destination: ShallowRef<PlanEdit[]>,
    snapshot: keyof PlanEdit,
  ) => {
    mergeCandidate = undefined;
    const edit = source.value.at(-1);
    if (!edit) {
      return;
    }
    source.value = source.value.slice(0, -1);
    applyingDepth += 1;
    try {
      plan.restore(edit[snapshot]);
    } finally {
      applyingDepth -= 1;
    }
    destination.value = [...destination.value, edit];
  };

  const undo = () => replayEdit(undoStack, redoStack, 'before');
  const redo = () => replayEdit(redoStack, undoStack, 'after');

  const clear = () => {
    mergeCandidate = undefined;
    undoStack.value = [];
    redoStack.value = [];
  };

  return {
    canUndo,
    canRedo,
    runMutation,
    commitSnapshot,
    undo,
    redo,
    clear,
  };
});
