import type { DeepReadonly } from 'vue';
import clipping from 'polygon-clipping';
import { polygonSmooth } from '@turf/polygon-smooth';
import simplify from 'simplify-js';
import Flatbush from 'flatbush';

export type PathPoint = { x: number; y: number };
/** Polygons, each containing an exterior ring followed by hole rings. */
export type GuildPath = PathPoint[][][];

export const cloneGuildPath = (path: DeepReadonly<GuildPath>): GuildPath =>
  path.map((polygon) => polygon.map((ring) => ring.map((point) => ({ ...point }))));

export const toMultiPolygon = (path: GuildPath): clipping.MultiPolygon =>
  path.map((polygon) => polygon.map((ring) => ring.map(({ x, y }) => [x, y])));

export const fromMultiPolygon = (multi: clipping.MultiPolygon): GuildPath =>
  multi.map((polygon) => polygon.map((ring) => ring.map(([x, y]) => ({ x, y }))));

export const joinPaths = (a: GuildPath, b: GuildPath): GuildPath =>
  fromMultiPolygon(clipping.union(toMultiPolygon(a), toMultiPolygon(b)));

export const subtractPaths = (a: GuildPath, b: GuildPath): GuildPath =>
  a.length
    ? fromMultiPolygon(clipping.difference(toMultiPolygon(a), toMultiPolygon(b)))
    : [];

export const guildPathData = (path: DeepReadonly<GuildPath>): string =>
  path
    .flat()
    .map((ring) =>
      ring.length ? `M ${ring.map(({ x, y }) => `${x},${y}`).join(' L ')} Z` : '',
    )
    .join(' ');

// Keep each region's original boundary if refinement changes its topology.
const refinePath = (
  path: GuildPath,
  transform: (polygon: clipping.Polygon) => clipping.Polygon,
): GuildPath => {
  if (!path.length) return [];
  const original = toMultiPolygon(path);
  const candidates = original.map((polygon) => {
    const normalized = clipping.union([transform(polygon)]);
    return normalized.length === 1 && normalized[0]!.length === polygon.length
      ? normalized[0]!
      : polygon;
  });

  // Include both outlines because a neighbor may fall back to its original.
  const index = new Flatbush(original.length);
  const bounds = original.map((polygon, i) => {
    const box: [number, number, number, number] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity,
    ];
    for (const ring of [polygon[0]!, candidates[i]![0]!]) {
      for (const [x, y] of ring) {
        box[0] = Math.min(box[0], x);
        box[1] = Math.min(box[1], y);
        box[2] = Math.max(box[2], x);
        box[3] = Math.max(box[3], y);
      }
    }
    index.add(...box);
    return box;
  });
  index.finish();

  return fromMultiPolygon(
    candidates.map((candidate, i) => {
      // Union detects shared edges as well as area overlaps. Point contacts and
      // islands inside holes still produce two regions and remain supported.
      const conflicts = index
        .search(...bounds[i]!)
        .some(
          (j) =>
            j !== i &&
            (clipping.union([candidate], [original[j]!]).length !== 2 ||
              clipping.union([candidate], [candidates[j]!]).length !== 2),
        );
      return conflicts ? original[i]! : candidate;
    }),
  );
};

/** Smooth only a new stroke; never repeatedly shrink the saved guild. */
export const smoothPath = (path: GuildPath): GuildPath =>
  refinePath(path, (polygon) => {
    const geometry = polygonSmooth(
      { type: 'Polygon', coordinates: polygon },
      { iterations: 1 },
    ).features[0]?.geometry;
    return geometry?.type === 'Polygon'
      ? (geometry.coordinates as clipping.Polygon)
      : polygon;
  });

export const simplifyPath = (path: GuildPath): GuildPath =>
  refinePath(path, (polygon) =>
    polygon.map((ring) => {
      const reduced = simplify(
        ring.map(([x, y]) => ({ x, y })),
        0.25,
        true,
      );
      // Preserve tiny rings; a closed triangle needs four points.
      return reduced.length >= 4 ? reduced.map(({ x, y }) => [x, y]) : ring;
    }),
  );
