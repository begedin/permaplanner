import type { MigrateStep } from '../types';

/** v5 plan fields live in config.json; guilds shard only bumps version. */
const migrateGuildsShardV4ToV5: MigrateStep = (doc) => ({
  ...(doc as Record<string, unknown>),
  version: 5,
});

export default migrateGuildsShardV4ToV5;
