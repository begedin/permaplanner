import { serverPlanSaveIntegration } from './server';
import type { PlanSaveIntegration } from '../planSaveIntegration';

export const planSaveIntegrations: PlanSaveIntegration[] = [serverPlanSaveIntegration];
