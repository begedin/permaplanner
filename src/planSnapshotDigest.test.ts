import { expect, it } from 'vitest';

import { buildLocalPlanJsonText } from './permaplannerFileExport';
import { PERMAPLANNER_FILE_VERSION } from './permaplannerFileVersion';
import { planSnapshotDigest } from './planSnapshotDigest';
import type { PermaplannerFileV1 } from './usePermaplannerStore';

const sampleDoc: PermaplannerFileV1 = {
  version: PERMAPLANNER_FILE_VERSION,
  syncRevision: 0,
  plants: [],
  guilds: [],
  mapScale: {
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
    linePhysicalLength: 1,
  },
  backgroundOpacity: 0.4,
  onboardingState: 'done',
};

it('planSnapshotDigest matches buildLocalPlanJsonText', () => {
  expect(planSnapshotDigest(sampleDoc)).toBe(buildLocalPlanJsonText(sampleDoc));
});
