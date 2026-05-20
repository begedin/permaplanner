import type { MigrateStep } from '../types';

/** v1: first explicit schema; v2 adds map scale defaults and normalized opacity. */
const migrateV1ToV2: MigrateStep = (doc) => {
  const next: Record<string, unknown> = { ...doc, version: 2 };
  if (
    next.mapScale === undefined ||
    typeof next.mapScale !== 'object' ||
    next.mapScale === null
  ) {
    next.mapScale = {
      start: { x: 20, y: 20 },
      end: { x: 150, y: 20 },
      linePhysicalLength: 1,
    };
  }
  if (
    typeof next.backgroundOpacity !== 'number' ||
    !Number.isFinite(next.backgroundOpacity)
  ) {
    next.backgroundOpacity = 0.4;
  }
  return next;
};

export default migrateV1ToV2;
