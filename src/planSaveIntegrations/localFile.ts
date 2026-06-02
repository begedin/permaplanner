import type {
  PlanSaveContext,
  PlanSaveIntegration,
  PlanSaveIntegrationDetailRow,
} from '../planSaveIntegration';
import { usePermaplannerStore } from '../usePermaplannerStore';

const formatTimestamp = (ms: number | undefined): string =>
  ms === undefined ? '—' : new Date(ms).toLocaleString();

export const localFilePlanSaveIntegration: PlanSaveIntegration = {
  id: 'local-file',
  label: 'Local file',
  isAvailable: () => true,
  isLinked: () => Boolean(usePermaplannerStore().fileHandle),
  save: async () => {
    await usePermaplannerStore().flushLocalSave();
  },
  loadDetails: async (ctx: PlanSaveContext) => {
    const store = usePermaplannerStore();
    await store.refreshLocalFileLastModified();
    const rows: PlanSaveIntegrationDetailRow[] = [];
    const name = ctx.fileName();
    if (name) {
      rows.push({ kind: 'text', label: 'File', value: name });
    }
    rows.push({
      kind: 'text',
      label: 'Last saved',
      value: formatTimestamp(store.localFileLastModifiedMs),
    });
    return rows;
  },
};
