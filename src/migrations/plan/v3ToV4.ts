import { migratePlantsOnDocument } from '../plantIconFields';
import type { MigrateStep } from '../types';

const migrateV3ToV4: MigrateStep = (doc) =>
  migratePlantsOnDocument(doc as Record<string, unknown>);

export default migrateV3ToV4;
