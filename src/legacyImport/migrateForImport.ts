import { migratePlanDocumentRaw } from '../permaplannerFileMigrate';
import { parseGardenDocument, type GardenDocument } from '../gardenDocument';

export const migrateForImport = async (raw: unknown): Promise<GardenDocument> => {
  const migrated = await migratePlanDocumentRaw(raw);
  return parseGardenDocument(migrated);
};
