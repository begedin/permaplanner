import type { MigrateStep } from '../types';

const migratePlantsShardV1ToV2: MigrateStep = (doc) => ({
  ...doc,
  version: 2,
});

export default migratePlantsShardV1ToV2;
