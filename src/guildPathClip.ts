import clipping from 'polygon-clipping';

export type PathPoint = { x: number; y: number };

const toRing = (path: PathPoint[]): [number, number][] =>
  path.map(({ x, y }) => [x, y] as [number, number]);

const fromMultiPolygon = (multi: clipping.MultiPolygon): PathPoint[] => {
  const path: PathPoint[] = [];
  // Retrace each bridge to preserve separate areas and holes in the flat path format.
  for (const ring of multi.flat()) {
    path.push(...ring.map(([x, y]) => ({ x, y })));
    if (path[0]) path.push({ ...path[0] });
  }
  return path;
};

export const joinPaths = (a: PathPoint[], b: PathPoint[]): PathPoint[] => {
  if (a.length === 0) {
    return b;
  }
  if (b.length === 0) {
    return a;
  }
  return fromMultiPolygon(clipping.union([toRing(a)], [toRing(b)]));
};

export const subtractPaths = (a: PathPoint[], b: PathPoint[]): PathPoint[] => {
  if (a.length === 0) {
    return a;
  }
  return fromMultiPolygon(clipping.difference([toRing(a)], [toRing(b)]));
};
