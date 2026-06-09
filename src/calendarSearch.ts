import type { IFuseOptions } from 'fuse.js';

import type { GardenSpeciesSidebarRow } from './calendarGardenPlants';
import { defaultFuzzySearchOptions, searchByFuse } from './guildSearch';

export type CalendarSpeciesSearchRecord = {
  speciesId: string;
  name: string;
  nameLatin: string;
  cultivarLabels: string;
  cultivarLatinLabels: string;
};

export const calendarFuseOptions: IFuseOptions<CalendarSpeciesSearchRecord> = {
  keys: [
    { name: 'name', weight: 0.45 },
    { name: 'nameLatin', weight: 0.25 },
    { name: 'cultivarLabels', weight: 0.2 },
    { name: 'cultivarLatinLabels', weight: 0.1 },
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
      nameLatin: row.nameLatin,
      cultivarLabels: row.cultivarLabels,
      cultivarLatinLabels: row.cultivarLatinLabels,
    })),
    query,
    calendarFuseOptions,
    (record) => byId.get(record.speciesId),
  ).filter((row): row is GardenSpeciesSidebarRow => row !== undefined);
};
