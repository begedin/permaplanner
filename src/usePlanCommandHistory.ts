import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';
import { planSavableStatesEqual, type PlanSavableState } from './planSavableState';
import { usePlanStateStore } from './usePlanStateStore';

export const MAX_UNDO_EDITS = 100;

export const usePlanCommandHistory = defineStore('planCommandHistory', () => {
  const plan = usePlanStateStore();
  // Adjacent edits share their boundary snapshot. The cursor identifies the current state.
  const timeline = shallowRef<PlanSavableState[]>([]);
  const cursor = ref(0);
  let applyingDepth = 0;
  let mergeToken: symbol | undefined;

  const canUndo = computed(() => cursor.value > 0);
  const canRedo = computed(() => cursor.value < timeline.value.length - 1);

  const runMutation = (mutate: () => void, token?: symbol) => {
    if (applyingDepth > 0) {
      mutate();
      return;
    }
    const before = plan.capture();
    applyingDepth += 1;
    try {
      mutate();
    } catch (error) {
      plan.restore(before);
      throw error;
    } finally {
      applyingDepth -= 1;
    }
    const after = plan.capture();
    const current = timeline.value[cursor.value];
    const continuous = current !== undefined && planSavableStatesEqual(current, before);
    const canMerge = continuous && token !== undefined && token === mergeToken;
    if (planSavableStatesEqual(before, after)) {
      if (!canMerge) mergeToken = undefined;
      return;
    }
    const states = continuous ? timeline.value.slice(0, cursor.value + 1) : [before];
    if (canMerge) states.pop();
    const returnsToStart = canMerge && planSavableStatesEqual(states.at(-1)!, after);
    if (!returnsToStart) states.push(after);
    timeline.value = states.slice(-(MAX_UNDO_EDITS + 1));
    cursor.value = timeline.value.length - 1;
    mergeToken = returnsToStart ? undefined : token;
  };

  const replay = (next: number) => {
    const state = timeline.value[next];
    if (!state) return;
    mergeToken = undefined;
    applyingDepth += 1;
    try {
      plan.restore(state);
    } finally {
      applyingDepth -= 1;
    }
    cursor.value = next;
  };
  const undo = () => {
    if (canUndo.value) replay(cursor.value - 1);
  };
  const redo = () => {
    if (canRedo.value) replay(cursor.value + 1);
  };
  const clear = () => {
    timeline.value = [];
    cursor.value = 0;
    mergeToken = undefined;
  };
  return { canUndo, canRedo, runMutation, undo, redo, clear };
});
