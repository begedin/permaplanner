import { ONBOARDING_STATE_AFTER_PLAN_MIGRATION } from '../../onboardingTypes';
import type { MigrateStep } from '../types';

const migrateV4ToV5: MigrateStep = (doc) => {
  const record: Record<string, unknown> = {
    ...(doc as Record<string, unknown>),
    version: 5,
  };
  if (typeof record.onboardingState !== 'string') {
    record.onboardingState = ONBOARDING_STATE_AFTER_PLAN_MIGRATION;
  }
  return record;
};

export default migrateV4ToV5;
