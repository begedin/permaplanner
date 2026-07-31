import { planMigrationLoaders } from './migrations/plan/loaders';
import { runMigrations } from './migrations/runMigrations';
import {
  PERMAPLANNER_FILE_VERSION,
  readDocumentVersion,
} from './permaplannerFileVersion';

export { readDocumentVersion };

export const documentNeedsMigration = (raw: unknown): boolean =>
  readDocumentVersion(raw) < PERMAPLANNER_FILE_VERSION;

export const migratePlanDocumentRaw = (raw: unknown): Promise<Record<string, unknown>> =>
  runMigrations(raw, { loaders: planMigrationLoaders, label: 'plan document' });
