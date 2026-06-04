import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { snapshotPlanCommand, type PlanCommand } from './planCommand';
import {
  capturePlanSavableState,
  planSavableStatesEqual,
  type PlanSavableState,
} from './planSavableState';
import { usePlanSaveCoordinator } from './usePlanSaveCoordinator';
import { usePermaplannerStore } from './usePermaplannerStore';

const shouldRecordCommands = (): boolean => {
  const permaplanner = usePermaplannerStore();
  return permaplanner.suppressAutosaveDepth === 0 && !permaplanner.isBulkPlanUpdate;
};

export const usePlanCommandHistory = defineStore('planCommandHistory', () => {
  const undoStack = ref<PlanCommand[]>([]);
  const redoStack = ref<PlanCommand[]>([]);

  /** While applying undo/redo/replay, nested mutations must not record new commands. */
  let applyingDepth = 0;

  const canUndo = computed(() => undoStack.value.length > 0);
  const canRedo = computed(() => redoStack.value.length > 0);

  const recordAppliedCommand = (command: PlanCommand) => {
    if (!shouldRecordCommands()) {
      return;
    }
    undoStack.value = [...undoStack.value, command];
    redoStack.value = [];
    usePlanSaveCoordinator().onEditApplied();
  };

  const run = (command: PlanCommand) => {
    if (applyingDepth > 0) {
      command.do();
      return;
    }
    recordAppliedCommand(command);
  };

  const runMutation = (mutate: () => void) => {
    if (applyingDepth > 0) {
      mutate();
      return;
    }
    if (!shouldRecordCommands()) {
      mutate();
      return;
    }
    const before = capturePlanSavableState();
    mutate();
    const after = capturePlanSavableState();
    if (planSavableStatesEqual(before, after)) {
      return;
    }
    recordAppliedCommand(snapshotPlanCommand(before, after));
  };

  const commitSnapshot = (before: PlanSavableState) => {
    if (applyingDepth > 0 || !shouldRecordCommands()) {
      return;
    }
    const after = capturePlanSavableState();
    if (planSavableStatesEqual(before, after)) {
      return;
    }
    recordAppliedCommand(snapshotPlanCommand(before, after));
  };

  const undo = () => {
    const command = undoStack.value.at(-1);
    if (!command) {
      return;
    }
    undoStack.value = undoStack.value.slice(0, -1);
    applyingDepth += 1;
    try {
      command.undo();
    } finally {
      applyingDepth -= 1;
    }
    redoStack.value = [...redoStack.value, command];
    usePlanSaveCoordinator().onEditApplied();
  };

  const redo = () => {
    const command = redoStack.value.at(-1);
    if (!command) {
      return;
    }
    redoStack.value = redoStack.value.slice(0, -1);
    applyingDepth += 1;
    try {
      command.do();
    } finally {
      applyingDepth -= 1;
    }
    undoStack.value = [...undoStack.value, command];
    usePlanSaveCoordinator().onEditApplied();
  };

  const clear = () => {
    undoStack.value = [];
    redoStack.value = [];
  };

  return {
    canUndo,
    canRedo,
    run,
    runMutation,
    commitSnapshot,
    undo,
    redo,
    clear,
    capturePlanSavableState,
  };
});
