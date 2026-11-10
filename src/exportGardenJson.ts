import { buildLocalPlanJsonText, downloadTextAsFile } from './permaplannerFileExport';
import { useGardenSessionStore } from './stores/useGardenSessionStore';

export const exportActiveGardenJson = (): void => {
  const store = useGardenSessionStore();
  const name = store.gardenName?.trim() || 'garden';
  const safe = name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'garden';
  downloadTextAsFile(`${safe}.json`, buildLocalPlanJsonText(store.snapshot()));
};
