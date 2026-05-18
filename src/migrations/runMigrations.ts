import { PERMAPLANNER_FILE_VERSION } from '../permaplannerFileVersion';
import { readDocumentVersion } from '../permaplannerFileVersion';
import type { MigrationLoader } from './types';

export type RunMigrationsOptions = {
  loaders: Record<number, MigrationLoader>;
  /** Used in error messages, e.g. `plan` or `plants.json`. */
  label: string;
  /** When set, non-object raw is wrapped as `{ [arrayKey]: raw }`. */
  arrayKey?: 'plants' | 'guilds';
};

export const runMigrations = async (
  raw: unknown,
  options: RunMigrationsOptions,
): Promise<Record<string, unknown>> => {
  const { loaders, label, arrayKey } = options;
  const base =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>) }
      : arrayKey !== undefined
        ? { [arrayKey]: raw }
        : {};
  let doc = base;
  let version = readDocumentVersion(doc);
  while (version < PERMAPLANNER_FILE_VERSION) {
    const loader = loaders[version];
    if (!loader) {
      throw new Error(
        `Unsupported ${label} version ${version} (current app expects up to ${PERMAPLANNER_FILE_VERSION})`,
      );
    }
    const mod = await loader();
    doc = mod.default(doc);
    version = readDocumentVersion(doc);
  }
  if (version > PERMAPLANNER_FILE_VERSION) {
    throw new Error(
      `${label} version ${version} is newer than this app supports (${PERMAPLANNER_FILE_VERSION})`,
    );
  }
  return doc;
};
