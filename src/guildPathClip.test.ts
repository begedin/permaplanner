import clipping from 'polygon-clipping';
import { expect, it } from 'vitest';
import { joinPaths, subtractPaths, type PathPoint } from './guildPathClip';

const square = (x: number, y = 0, size = 10): PathPoint[] => [
  { x, y },
  { x: x + size, y },
  { x: x + size, y: y + size },
  { x, y: y + size },
];
const polygons = (path: PathPoint[]) =>
  clipping.union([path.map(({ x, y }) => [x, y] as [number, number])]);

it.each([5, 10, 20])('unions areas %s units apart without filling gaps', (offset) => {
  const a = square(0);
  const b = square(offset);
  expect(polygons(joinPaths(a, b))).toEqual(
    clipping.union(
      [a.map(({ x, y }) => [x, y] as [number, number])],
      [b.map(({ x, y }) => [x, y] as [number, number])],
    ),
  );
});

it('preserves holes and separate regions across further edits and merges', () => {
  const outer = square(0, 0, 30);
  const hole = square(10, 10);
  const cut = subtractPaths(outer, hole);
  const merged = joinPaths(cut, square(50));
  expect(polygons(merged)).toEqual(clipping.union(polygons(cut), polygons(square(50))));
  expect(polygons(subtractPaths(merged, square(50)))).toEqual(polygons(cut));
});

it('handles either or both guilds having no aerial area', () => {
  expect([joinPaths([], square(0)), joinPaths(square(0), []), joinPaths([], [])]).toEqual(
    [square(0), square(0), []],
  );
});
