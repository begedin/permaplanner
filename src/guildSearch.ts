import Fuse, { type IFuseOptions } from 'fuse.js';

import type { Guild, Plant } from './gardenTypes';
import { plantDisplayLabel } from './resolvePlant';

export type GuildSearchRecord = {
  guildId: string;
  name: string;
  plantLabels: string;
  note: string;
};

export const guildFuseOptions: IFuseOptions<GuildSearchRecord> = {
  keys: [
    { name: 'name', weight: 0.6 },
    { name: 'plantLabels', weight: 0.3 },
    { name: 'note', weight: 0.1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
};

/** Shared fuzzy settings for per-field highlight (`Fuse.match`). */
export const guildFuzzyMatchOptions = {
  threshold: guildFuseOptions.threshold,
  ignoreLocation: guildFuseOptions.ignoreLocation,
  minMatchCharLength: guildFuseOptions.minMatchCharLength,
  includeMatches: true,
};

export const buildGuildSearchRecord = (
  guild: Guild,
  resolvePlant: (plantId: string) => Plant,
): GuildSearchRecord => {
  const labels = new Set<string>();
  for (const thing of guild.plants) {
    labels.add(thing.nameOrCultivar);
    const plant = resolvePlant(thing.plantId);
    labels.add(plantDisplayLabel(plant));
    labels.add(plant.name);
    if (plant.cultivar) {
      labels.add(plant.cultivar);
    }
  }

  return {
    guildId: guild.id,
    name: guild.name,
    plantLabels: [...labels].filter(Boolean).join(' '),
    note: guild.note ?? '',
  };
};

export const searchGuilds = (
  guilds: Guild[],
  query: string,
  resolvePlant: (plantId: string) => Plant,
): Guild[] => {
  const q = query.trim();
  if (!q) {
    return guilds;
  }

  const records = guilds.map((g) => buildGuildSearchRecord(g, resolvePlant));
  const fuse = new Fuse(records, guildFuseOptions);
  const byId = new Map(guilds.map((g) => [g.id, g]));

  return fuse
    .search(q)
    .map((hit) => byId.get(hit.item.guildId))
    .filter((g): g is Guild => g !== undefined);
};

export type HighlightSegment = {
  text: string;
  match: boolean;
};

type InclusiveRange = [number, number];

export const fuzzyMatchRanges = (
  text: string,
  query: string,
  options: Pick<
    IFuseOptions<unknown>,
    'threshold' | 'ignoreLocation' | 'minMatchCharLength' | 'includeMatches'
  > = guildFuzzyMatchOptions,
): InclusiveRange[] => {
  const q = query.trim();
  if (!q || !text) {
    return [];
  }

  const result = Fuse.match(q, text, options);
  if (!result.isMatch || !result.indices) {
    return [];
  }

  return [...result.indices];
};

export const mergeInclusiveRanges = (ranges: InclusiveRange[]): InclusiveRange[] => {
  if (ranges.length === 0) {
    return [];
  }

  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const merged: InclusiveRange[] = [sorted[0]!];

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (cur[0] <= last[1] + 1) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      merged.push(cur);
    }
  }

  return merged;
};

/** Span disjoint fuzzy indices into one contiguous highlight. */
export const spanHighlightRanges = (ranges: InclusiveRange[]): InclusiveRange[] => {
  const merged = mergeInclusiveRanges(ranges);
  if (merged.length <= 1) {
    return merged;
  }

  return [[merged[0]![0], merged[merged.length - 1]![1]]];
};

export const highlightSegments = (text: string, query: string): HighlightSegment[] => {
  const ranges = spanHighlightRanges(fuzzyMatchRanges(text, query));
  if (ranges.length === 0) {
    return [{ text, match: false }];
  }

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    if (cursor < start) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end + 1), match: true });
    cursor = end + 1;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }

  return segments;
};
