import clipping from 'polygon-clipping';
import { expect, it, vi } from 'vitest';
import {
  joinPaths,
  subtractPaths,
  smoothPath,
  simplifyPath,
  toMultiPolygon,
  guildPathData,
  type GuildPath,
} from './guildPathClip';

const square = (x: number, y = 0, size = 10): GuildPath => [
  [
    [
      { x, y },
      { x: x + size, y },
      { x: x + size, y: y + size },
      { x, y: y + size },
      { x, y },
    ],
  ],
];

it.each([5, 10, 20])('unions areas %s units apart without filling gaps', (offset) => {
  const a = square(0);
  const b = square(offset);
  expect(toMultiPolygon(joinPaths(a, b))).toEqual(
    clipping.union(toMultiPolygon(a), toMultiPolygon(b)),
  );
});

it('keeps holes and disconnected regions as separate closed boundaries across edits', () => {
  const cut = subtractPaths(square(0, 0, 30), square(10, 10));
  const merged = joinPaths(cut, square(50));
  expect(merged.map((polygon) => polygon.length)).toEqual([2, 1]);
  expect(subtractPaths(merged, square(50))).toEqual(cut);
  for (const ring of merged.flat()) {
    expect(ring.at(-1)).toEqual(ring[0]);
    expect(ring).toHaveLength(5);
  }
  expect(guildPathData(merged).match(/M /g)).toHaveLength(3);
});

it('rounds corners independently while retaining holes and gaps', () => {
  const original = joinPaths(subtractPaths(square(0, 0, 30), square(10, 10)), square(50));
  const smoothed = smoothPath(original);
  expect(smoothed.map((polygon) => polygon.map((ring) => ring.length))).toEqual([
    [9, 9],
    [9],
  ]);
  expect(smoothed).not.toEqual(original);
  expect(
    clipping.intersection(toMultiPolygon(smoothed), toMultiPolygon(square(34, 0, 10))),
  ).toEqual([]);
  expect(
    clipping.intersection(toMultiPolygon(smoothed), toMultiPolygon(square(13, 13, 4))),
  ).toEqual([]);
  expect(toMultiPolygon(smoothed)).toEqual(clipping.union(toMultiPolygon(smoothed)));
});

it('handles empty areas', () => {
  expect([
    joinPaths([], square(0)),
    joinPaths(square(0), []),
    joinPaths([], []),
    subtractPaths([], square(0)),
    smoothPath([]),
  ]).toEqual([square(0), square(0), [], [], []]);
});

it('preserves a hole near the exterior while smoothing unrelated regions', () => {
  const problematic = subtractPaths(square(0, 0, 100), square(1, 1, 10));
  expect(smoothPath(problematic)).toEqual(problematic);
  const unrelated = square(200, 0, 30);
  const together = joinPaths(problematic, unrelated);
  expect(smoothPath(together)).toEqual([...problematic, ...smoothPath(unrelated)]);
  expect(smoothPath([...unrelated, ...problematic])).toEqual([
    ...smoothPath(unrelated),
    ...problematic,
  ]);
});

it('falls back only for colliding neighbors, independently of their order', () => {
  const concave: GuildPath = [
    [
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 10, y: 10 },
        { x: 10, y: 20 },
        { x: 0, y: 20 },
        { x: 0, y: 0 },
      ],
    ],
  ];
  const neighbor = square(11, 11, 0.5);
  const distant = square(100, 0, 10);
  expect(
    clipping.intersection(toMultiPolygon(smoothPath(concave)), toMultiPolygon(neighbor)),
  ).not.toEqual([]);
  for (const nearby of [
    [...concave, ...neighbor],
    [...neighbor, ...concave],
  ]) {
    expect(smoothPath([...nearby, ...distant])).toEqual([
      ...nearby,
      ...smoothPath(distant),
    ]);
  }
});

it('reduces large closed outlines without losing small holes or disconnected regions', () => {
  const circle = Array.from({ length: 10_001 }, (_, i) => {
    const angle = (2 * Math.PI * (i % 10_000)) / 10_000;
    return { x: 100 * Math.cos(angle), y: 100 * Math.sin(angle) };
  });
  const original = joinPaths(subtractPaths([[circle]], square(0, 0, 0.1)), square(200));
  const reduced = simplifyPath(original);
  expect(reduced.map((polygon) => polygon.length)).toEqual([2, 1]);
  expect(reduced.flat(2).length).toBeLessThan(150);
  expect(
    clipping.intersection(
      toMultiPolygon(reduced),
      toMultiPolygon(square(0.02, 0.02, 0.05)),
    ),
  ).toEqual([]);
  expect(toMultiPolygon(reduced)).toEqual(clipping.union(toMultiPolygon(reduced)));
  expect(simplifyPath(reduced)).toEqual(reduced);
});

it('preserves a unit square when translated to large coordinates', () => {
  const translated = square(1e8, 1e8, 1);
  expect(simplifyPath(translated)).toEqual(translated);
});

it('preserves narrow gaps when simplification would create a shared edge', () => {
  const indented: GuildPath = [
    [
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 9.9, y: 2 },
        { x: 9.9, y: 8 },
        { x: 10, y: 10 },
        { x: 0, y: 10 },
        { x: 0, y: 0 },
      ],
    ],
  ];
  const neighbor = square(10, 3, 1);
  const distant = smoothPath(square(100));
  expect(simplifyPath(indented)).toEqual(square(0));
  for (const nearby of [
    [...indented, ...neighbor],
    [...neighbor, ...indented],
  ]) {
    const result = simplifyPath([...nearby, ...distant]);
    expect(result).toEqual([...nearby, ...simplifyPath(distant)]);
    expect(clipping.union(toMultiPolygon(result))).toHaveLength(3);
  }
});

it('allows point contacts and islands inside intentional holes', () => {
  const original = joinPaths(subtractPaths(square(0, 0, 30), square(5, 5, 20)), [
    ...square(10, 10, 2),
    ...square(30, 30),
  ]);
  expect(original).toHaveLength(3);
  expect(simplifyPath(original)).toEqual(original);
});

it('avoids pairwise polygon operations for distant regions', () => {
  const original = Array.from({ length: 600 }, (_, i) => square(i * 3, 0, 1)).flat();
  const union = vi.spyOn(clipping, 'union');
  try {
    expect(simplifyPath(original)).toEqual(original);
    // Bound expensive operations instead of relying on a machine-dependent timer.
    expect(union.mock.calls.length).toBeLessThan(original.length * 2);
  } finally {
    union.mockRestore();
  }
});
