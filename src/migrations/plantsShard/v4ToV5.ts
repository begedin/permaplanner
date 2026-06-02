import type { MigrateStep } from '../types';

/** v5 plan fields live in config.json; plants shard only bumps version. */
const migratePlantsShardV4ToV5: MigrateStep = (doc) => ({
  ...(doc as Record<string, unknown>),
  version: 5,
});

export default migratePlantsShardV4ToV5;
