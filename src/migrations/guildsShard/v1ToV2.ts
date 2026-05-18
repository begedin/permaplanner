import type { MigrateStep } from '../types';

const migrateGuildsShardV1ToV2: MigrateStep = (doc) => ({
  ...doc,
  version: 2,
});

export default migrateGuildsShardV1ToV2;
