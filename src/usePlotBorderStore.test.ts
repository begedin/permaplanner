import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';
import { usePlotBorderStore } from './usePlotBorderStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';

const triangle = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
];
beforeEach(() => setActivePinia(createPinia()));

it.each([
  ['incomplete', triangle.slice(0, 2)],
  ['zero-area', triangle.map(({ x }) => ({ x, y: x }))],
  ['NaN', [...triangle.slice(0, 2), { x: NaN, y: 10 }]],
  ['infinite', [triangle[0]!, { x: Infinity, y: 0 }, triangle[2]!]],
])('rejects %s borders without changing history', (_name, points) => {
  const border = usePlotBorderStore();
  expect(border.save(points)).toBe(false);
  expect(border.points).toEqual([]);
  expect(usePlanCommandHistory().canUndo).toBe(false);
});

it('accepts either winding, clones input points and allows removal', () => {
  const border = usePlotBorderStore();
  const points = triangle.map((point) => ({ ...point }));
  for (const polygon of [points, [...points].reverse()]) {
    expect(border.save(polygon)).toBe(true);
    expect(border.points).toEqual(polygon);
  }
  points[0]!.x = 100;
  expect(border.points).toEqual([...triangle].reverse());
  expect(border.save([])).toBe(true);
  expect(border.points).toEqual([]);
});
