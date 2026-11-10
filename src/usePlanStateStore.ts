import { defineStore } from 'pinia';
import { reactive } from 'vue';
import {
  clonePlanState,
  createEmptyPlanState,
  type PlanSavableState,
} from './planSavableState';

/** Owns editable data only; server identity, revision, and history live outside it. */
export const usePlanStateStore = defineStore('planState', () => {
  const state = reactive(createEmptyPlanState());

  const capture = (): PlanSavableState => clonePlanState(state);
  const restore = (next: PlanSavableState) => {
    Object.assign(state, clonePlanState(next));
  };

  return { state, capture, restore };
});
