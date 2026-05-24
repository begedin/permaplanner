import { migratePlantsOnDocument } from '../plantIconFields';
import type { MigrateStep } from '../types';

const migratePlantsShardV3ToV4: MigrateStep = (doc) =>
  migratePlantsOnDocument(doc as Record<string, unknown>);

export default migratePlantsShardV3ToV4;
