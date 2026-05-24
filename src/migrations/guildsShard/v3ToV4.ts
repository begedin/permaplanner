import type { MigrateStep } from '../types';

const migrateGuildsShardV3ToV4: MigrateStep = (doc) => ({
  ...doc,
  version: 4,
});

export default migrateGuildsShardV3ToV4;
