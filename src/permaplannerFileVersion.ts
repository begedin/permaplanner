/** Current on-disk / GitHub plan document version (monolithic file and repo shards). */
export const PERMAPLANNER_FILE_VERSION = 4 as const;

export type PermaplannerFileVersion = typeof PERMAPLANNER_FILE_VERSION | 1 | 2 | 3;

export const readDocumentVersion = (raw: unknown): number => {
  if (!raw || typeof raw !== 'object') {
    return 0;
  }
  const v = (raw as Record<string, unknown>).version;
  if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
    return Math.floor(v);
  }
  return 0;
};
