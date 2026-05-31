import type { CatalogPhenology } from './plantCatalog';
import { isMonthInCatalogPeriod, resolvePhenology } from './plantCatalog';
import type { GuildFunction, GuildLayer, Plant } from './gardenTypes';
import { plantGuildGroupLabel } from './resolvePlant';

export type GuildPlantTooltipRow = {
  label: string;
  count: number;
  functions: GuildFunction[];
  layers: GuildLayer[];
  phenology: CatalogPhenology;
};

export const guildPlantTooltipRows = (
  plantIds: string[],
  resolvePlant: (plantId: string) => Plant,
): GuildPlantTooltipRow[] => {
  const byPlantId = new Map<string, GuildPlantTooltipRow>();
  for (const plantId of plantIds) {
    const rp = resolvePlant(plantId);
    let row = byPlantId.get(plantId);
    if (!row) {
      row = {
        label: plantGuildGroupLabel(rp),
        count: 0,
        functions: rp.functions,
        layers: rp.layers,
        phenology: resolvePhenology(rp.speciesId, rp.cultivarId),
      };
      byPlantId.set(plantId, row);
    }
    row.count++;
  }
  return [...byPlantId.values()].sort((a, b) => a.label.localeCompare(b.label));
};

const formatRows = (heading: string, rows: GuildPlantTooltipRow[]): string => {
  if (rows.length === 0) {
    return `${heading}: none`;
  }
  const list = rows
    .map((r) => (r.count > 1 ? `${r.label} ×${r.count}` : r.label))
    .join(', ');
  return `${heading}: ${list}`;
};

export const functionLabelTooltip = (
  rows: GuildPlantTooltipRow[],
  fn: GuildFunction,
  fnLabel: string,
): string =>
  formatRows(
    fnLabel,
    rows.filter((r) => r.functions.includes(fn)),
  );

export const layerLabelTooltip = (
  rows: GuildPlantTooltipRow[],
  layer: GuildLayer,
  layerLabel: string,
): string =>
  formatRows(
    layerLabel,
    rows.filter((r) => r.layers.includes(layer)),
  );

type PhenologyAspect = 'fruiting' | 'blooming';

export const monthAspectTooltip = (
  rows: GuildPlantTooltipRow[],
  monthIndex: number,
  aspect: PhenologyAspect,
  monthName: string,
): string => {
  const month = monthIndex + 1;
  const aspectLabel = aspect === 'fruiting' ? 'fruit' : 'bloom';
  return formatRows(
    `${monthName} ${aspectLabel}`,
    rows.filter((r) => {
      const period = r.phenology[aspect];
      return period !== undefined && isMonthInCatalogPeriod(month, period);
    }),
  );
};

export const monthHeaderTooltip = (
  rows: GuildPlantTooltipRow[],
  monthIndex: number,
  monthName: string,
): string => {
  const month = monthIndex + 1;
  const matching = rows.filter((r) => {
    const { fruiting, blooming } = r.phenology;
    return (
      (fruiting !== undefined && isMonthInCatalogPeriod(month, fruiting)) ||
      (blooming !== undefined && isMonthInCatalogPeriod(month, blooming))
    );
  });
  return formatRows(monthName, matching);
};
