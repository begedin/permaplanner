import { planMigrationLoaders } from './migrations/plan/loaders';
import { guildsShardMigrationLoaders } from './migrations/guildsShard/loaders';
import { plantsShardMigrationLoaders } from './migrations/plantsShard/loaders';
import { runMigrations } from './migrations/runMigrations';
import { PERMAPLANNER_FILE_VERSION, readDocumentVersion } from './permaplannerFileVersion';

export type GithubShardMigrationVersions = {
  config?: number;
  plants?: number;
  guilds?: number;
};

export { readDocumentVersion };

export const documentNeedsMigration = (raw: unknown): boolean =>
  readDocumentVersion(raw) < PERMAPLANNER_FILE_VERSION;

export const migratePlanDocumentRaw = (raw: unknown): Promise<Record<string, unknown>> =>
  runMigrations(raw, { loaders: planMigrationLoaders, label: 'plan document' });

export const migratePlantsShardRaw = (raw: unknown): Promise<Record<string, unknown>> =>
  runMigrations(raw, {
    loaders: plantsShardMigrationLoaders,
    label: 'plants.json',
    arrayKey: 'plants',
  });

export const migrateGuildsShardRaw = (raw: unknown): Promise<Record<string, unknown>> =>
  runMigrations(raw, {
    loaders: guildsShardMigrationLoaders,
    label: 'guilds.json',
    arrayKey: 'guilds',
  });

export const plantsArrayFromShard = async (raw: unknown): Promise<unknown> => {
  const doc = await migratePlantsShardRaw(raw);
  return doc.plants ?? [];
};

export const guildsArrayFromShard = async (raw: unknown): Promise<unknown> => {
  const doc = await migrateGuildsShardRaw(raw);
  return doc.guilds ?? [];
};
