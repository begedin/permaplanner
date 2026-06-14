import type {
  PlanSaveContext,
  PlanSaveIntegration,
  PlanSaveIntegrationDetailRow,
} from '../planSaveIntegration';
import { ApiError } from '../api/client';
import * as gardensApi from '../api/gardens';
import { useAuthStore } from '../stores/useAuthStore';
import { useGardenSessionStore } from '../stores/useGardenSessionStore';
import { usePermaplannerStore } from '../usePermaplannerStore';

const formatTimestamp = (iso: string | undefined): string =>
  iso ? new Date(iso).toLocaleString() : '—';

export const serverPlanSaveIntegration: PlanSaveIntegration = {
  id: 'server',
  label: 'Permaplanner cloud',
  isAvailable: () => Boolean(useAuthStore().user?.totpConfirmed),
  isLinked: () => Boolean(usePermaplannerStore().gardenId),
  save: async (ctx: PlanSaveContext) => {
    const store = usePermaplannerStore();
    const id = store.gardenId;
    if (!id) {
      throw new Error('No active garden selected.');
    }
    const document = ctx.snapshot();
    try {
      const syncRevision = await gardensApi.updateGarden(id, document);
      store.setSyncRevision(syncRevision);
      await useGardenSessionStore().refreshList();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const fresh = await gardensApi.fetchGarden(id);
        await store.hydrateFromDocument(fresh.document, {
          id: fresh.id,
          name: fresh.name,
        });
        throw new Error(
          'Your garden was updated elsewhere. Loaded the latest copy — review and save again.',
        );
      }
      throw e;
    }
  },
  loadDetails: async (ctx: PlanSaveContext) => {
    const store = usePermaplannerStore();
    const rows: PlanSaveIntegrationDetailRow[] = [];
    const name = ctx.gardenName();
    if (name) {
      rows.push({ kind: 'text', label: 'Garden', value: name });
    }
    const summary = useGardenSessionStore().gardens.find((g) => g.id === store.gardenId);
    rows.push({
      kind: 'text',
      label: 'Last saved',
      value: formatTimestamp(summary?.updatedAt),
    });
    return rows;
  },
};
