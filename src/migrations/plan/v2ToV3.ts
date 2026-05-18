import { splitGuildFieldsOnDocument } from '../../guildPersistence';
import type { MigrateStep } from '../types';

const migrateV2ToV3: MigrateStep = (doc) => splitGuildFieldsOnDocument(doc);

export default migrateV2ToV3;
