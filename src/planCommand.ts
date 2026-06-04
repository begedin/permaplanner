import { applyPlanSavableState, type PlanSavableState } from './planSavableState';

export type PlanCommand = {
  do(): void;
  undo(): void;
};

export const snapshotPlanCommand = (
  before: PlanSavableState,
  after: PlanSavableState,
): PlanCommand => ({
  do: () => applyPlanSavableState(after),
  undo: () => applyPlanSavableState(before),
});
