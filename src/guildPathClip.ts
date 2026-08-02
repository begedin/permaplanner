import clipping from 'polygon-clipping';

export type PathPoint = { x: number; y: number };

const toRing = (path: PathPoint[]): [number, number][] =>
  path.map(({ x, y }) => [x, y] as [number, number]);

const fromMultiPolygon = (multi: clipping.MultiPolygon): PathPoint[] =>
  multi
    .map((polygon) => polygon.map((ring) => ring.map(([x, y]) => ({ x, y }))))
    .flat()
    .flat();

export const joinPaths = (a: PathPoint[], b: PathPoint[]): PathPoint[] => {
  if (a.length === 0) {
    return b;
  }
  return fromMultiPolygon(clipping.union([toRing(a)], [toRing(b)]));
};

export const subtractPaths = (a: PathPoint[], b: PathPoint[]): PathPoint[] => {
  if (a.length === 0) {
    return a;
  }
  return fromMultiPolygon(clipping.difference([toRing(a)], [toRing(b)]));
};
