import { defineStore } from 'pinia';
import { computed, shallowRef, type ShallowRef } from 'vue';

import {
  applyPlanSavableState,
  capturePlanSavableState,
  planSavableStatesEqual,
  type PlanSavableState,
} from './planSavableState';
import { usePermaplannerStore } from './usePermaplannerStore';

type PlanEdit = { before: PlanSavableState; after: PlanSavableState };

const shouldRecordCommands = (): boolean => {
  const permaplanner = usePermaplannerStore();
  return !permaplanner.isBulkPlanUpdate;
};

export const usePlanCommandHistory = defineStore('planCommandHistory', () => {
  const undoStack = shallowRef<PlanEdit[]>([]);
  const redoStack = shallowRef<PlanEdit[]>([]);

  /** While applying undo/redo, nested mutations must not record new commands. */
  let applyingDepth = 0;

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const commitSnapshot = (before: PlanSavableState) => {
    if (applyingDepth > 0 || !shouldRecordCommands()) return;
    const after = capturePlanSavableState();
    if (planSavableStatesEqual(before, after)) return;
    undoStack.value = [...undoStack.value, { before, after }];
    redoStack.value = [];
  };

  const runMutation = (mutate: () => void) => {
    if (applyingDepth > 0 || !shouldRecordCommands()) {
      mutate();
      return;
    }
    const before = capturePlanSavableState();
    mutate();
    commitSnapshot(before);
  };

  const replayEdit = (
    source: ShallowRef<PlanEdit[]>,
    destination: ShallowRef<PlanEdit[]>,
    snapshot: keyof PlanEdit,
  ) => {
    const edit = source.value.at(-1);
    if (!edit) {
      return;
    }
    source.value = source.value.slice(0, -1);
    applyingDepth += 1;
    try {
      applyPlanSavableState(edit[snapshot]);
    } finally {
      applyingDepth -= 1;
    }
    destination.value = [...destination.value, edit];
  };

  const undo = () => replayEdit(undoStack, redoStack, 'before');
  const redo = () => replayEdit(redoStack, undoStack, 'after');

  const clear = () => {
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
