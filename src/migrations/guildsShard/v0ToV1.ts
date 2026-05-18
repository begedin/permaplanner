import type { MigrateStep } from '../types';

const migrateGuildsShardV0ToV1: MigrateStep = (doc) => ({
  ...doc,
  version: 1,
});

export default migrateGuildsShardV0ToV1;
