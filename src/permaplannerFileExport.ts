import type { GardenDocument } from './gardenDocument';
import { withPersistedGuildPlantLabels } from './guildPlantLabels';

export const buildLocalPlanJsonText = (snapshot: GardenDocument): string =>
  JSON.stringify(withPersistedGuildPlantLabels(snapshot), null, 2);

export const downloadTextAsFile = (
  filename: string,
  text: string,
  mime = 'application/json',
): void => {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};
