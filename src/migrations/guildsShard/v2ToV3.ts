import { splitGuildFieldsOnDocument } from '../../guildPersistence';
import type { MigrateStep } from '../types';

const migrateGuildsShardV2ToV3: MigrateStep = (doc) => splitGuildFieldsOnDocument(doc);

export default migrateGuildsShardV2ToV3;
