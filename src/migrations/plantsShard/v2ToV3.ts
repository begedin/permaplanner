import type { MigrateStep } from '../types';

const migratePlantsShardV2ToV3: MigrateStep = (doc) => ({
  ...doc,
  version: 3,
});

export default migratePlantsShardV2ToV3;
