import type { MigrationLoader } from '../types';

/** Index = source version (0 → loads v0ToV1, 1 → loads v1ToV2). */
export const planMigrationLoaders: Record<number, MigrationLoader> = {
  0: () => import('./v0ToV1'),
  1: () => import('./v1ToV2'),
  2: () => import('./v2ToV3'),
  3: () => import('./v3ToV4'),
};
