import type { MigrateStep } from '../types';

const migratePlantsShardV0ToV1: MigrateStep = (doc) => ({
  ...doc,
  version: 1,
});

export default migratePlantsShardV0ToV1;
