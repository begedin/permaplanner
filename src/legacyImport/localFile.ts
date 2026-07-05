import * as gardensApi from '../api/gardens';
import type { GardenDocument } from '../gardenDocument';
import { migrateForImport } from './migrateForImport';

export const importJsonText = async (
  text: string,
  opts?: { name?: string },
): Promise<gardensApi.GardenRecord> => {
  const raw = JSON.parse(text) as unknown;
  const document = await migrateForImport(raw);
  return gardensApi.importGardenDocument({
    document,
    name: opts?.name,
  });
};

export const importGardenDocument = async (
  document: GardenDocument,
  opts?: { name?: string },
): Promise<gardensApi.GardenRecord> =>
  gardensApi.importGardenDocument({
    document,
    name: opts?.name,
  });

export const pickAndImportLocalFile = async (): Promise<gardensApi.GardenRecord> => {
  const [handle] = await window.showOpenFilePicker({
    types: [{ accept: { 'application/json': ['.json'] } }],
    multiple: false,
  });
  const file = await handle.getFile();
  const stem = file.name.replace(/\.json$/i, '') || 'Imported garden';
  return importJsonText(await file.text(), { name: stem });
};
