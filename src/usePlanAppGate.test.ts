import { beforeEach, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { planAppGateMode } from './usePlanAppGate';
import { clearPlanMigrationPending } from './usePlanMigration';
import { isRestoringSession } from './usePlanSession';
import { usePermaplannerStore } from './usePermaplannerStore';

beforeEach(() => {
  setActivePinia(createPinia());
  clearPlanMigrationPending();
  isRestoringSession.value = false;
});

it('planAppGateMode is setup when no local file and not on GitHub', () => {
  expect(planAppGateMode.value).toBe('setup');
});

it('planAppGateMode is null when a local plan file is linked', () => {
  usePermaplannerStore().fileName = 'garden.json';
  expect(planAppGateMode.value).toBeNull();
});
