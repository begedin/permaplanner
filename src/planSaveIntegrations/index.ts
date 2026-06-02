import { githubPlanSaveIntegration } from './github';
import { localFilePlanSaveIntegration } from './localFile';
import type { PlanSaveIntegration } from '../planSaveIntegration';

export const planSaveIntegrations: PlanSaveIntegration[] = [
  localFilePlanSaveIntegration,
  githubPlanSaveIntegration,
];
