import { buildLocalPlanJsonText, downloadTextAsFile } from './permaplannerFileExport';
import { usePermaplannerStore } from './usePermaplannerStore';

export const exportActiveGardenJson = (): void => {
  const store = usePermaplannerStore();
  const name = store.gardenName?.trim() || 'garden';
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'garden';
  downloadTextAsFile(`${safe}.json`, buildLocalPlanJsonText(store.snapshot()));
};
