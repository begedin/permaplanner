import { buildLocalPlanJsonText } from './permaplannerFileExport';
import type { PermaplannerFileV1 } from './usePermaplannerStore';

/** Canonical serialized plan (matches local file + export normalization). */
export const planSnapshotDigest = (doc: PermaplannerFileV1): string =>
  buildLocalPlanJsonText(doc);
