import clipping from 'polygon-clipping';
import type { GuildPath } from '../guildPathClip';

/** Version 7's single nonzero-fill path may contain bridges and intersections. */
export const convertLegacyGuildPath = (value: unknown): GuildPath => {
  if (!Array.isArray(value)) throw new Error('Invalid legacy guild path');
  if (value.length === 0) return [];
  const ring: clipping.Ring = value.map((point: unknown) => {
    if (
      !point ||
      typeof point !== 'object' ||
      !('x' in point) ||
      !('y' in point) ||
      typeof point.x !== 'number' ||
      typeof point.y !== 'number' ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y)
    )
      throw new Error('Invalid legacy guild point');
    return [point.x, point.y];
  });
  return clipping
    .union([ring])
    .map((polygon) => polygon.map((boundary) => boundary.map(([x, y]) => ({ x, y }))));
};
