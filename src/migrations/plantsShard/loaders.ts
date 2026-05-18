import type { MigrationLoader } from '../types';

export const plantsShardMigrationLoaders: Record<number, MigrationLoader> = {
  0: () => import('./v0ToV1'),
  1: () => import('./v1ToV2'),
};
