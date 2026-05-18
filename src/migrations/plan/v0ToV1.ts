import type { MigrateStep } from '../types';

/** v0: saves with no `version` field. */
const migrateV0ToV1: MigrateStep = (doc) => ({
  ...doc,
  version: 1,
  syncRevision:
    typeof doc.syncRevision === 'number' && Number.isFinite(doc.syncRevision)
      ? Math.max(0, Math.floor(doc.syncRevision))
      : 0,
  backgroundImage:
    typeof doc.backgroundImage === 'string'
      ? doc.backgroundImage
      : typeof doc.backgroundImageDataUrl === 'string'
        ? doc.backgroundImageDataUrl
        : doc.backgroundImage,
});

export default migrateV0ToV1;
