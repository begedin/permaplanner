import type { IFuseOptions } from 'fuse.js';

import type { GardenSpeciesSidebarRow } from './calendarGardenPlants';
import { defaultFuzzySearchOptions, searchByFuse } from './guildSearch';

export type CalendarSpeciesSearchRecord = {
  speciesId: string;
  name: string;
  cultivarLabels: string;
};

export const calendarFuseOptions: IFuseOptions<CalendarSpeciesSearchRecord> = {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'cultivarLabels', weight: 0.3 },
  ],
  ...defaultFuzzySearchOptions,
};

export const searchGardenSpecies = (
  rows: GardenSpeciesSidebarRow[],
  query: string,
): GardenSpeciesSidebarRow[] => {
  const byId = new Map(rows.map((row) => [row.speciesId, row]));
  return searchByFuse(
    rows.map((row) => ({
      speciesId: row.speciesId,
      name: row.name,
      cultivarLabels: row.cultivarLabels,
    })),
    query,
    calendarFuseOptions,
    (record) => byId.get(record.speciesId),
  ).filter((row): row is GardenSpeciesSidebarRow => row !== undefined);
};
