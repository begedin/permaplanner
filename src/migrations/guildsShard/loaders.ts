import type { MigrationLoader } from '../types';

export const guildsShardMigrationLoaders: Record<number, MigrationLoader> = {
  0: () => import('./v0ToV1'),
  1: () => import('./v1ToV2'),
  2: () => import('./v2ToV3'),
  3: () => import('./v3ToV4'),
};
