import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, expect, it } from 'vitest';
import { usePlotBorderStore } from './usePlotBorderStore';
import { usePlanCommandHistory } from './usePlanCommandHistory';
import { cloneGuildPath } from './guildPathClip';

const triangle = [
  { x: 0, y: 0 },
  { x: 10, y: 0 },
  { x: 10, y: 10 },
  { x: 0, y: 0 },
];
beforeEach(() => setActivePinia(createPinia()));
it.each([
  ['incomplete', triangle.slice(0, 2)],
  ['zero-area', triangle.map(({ x }) => ({ x, y: x }))],
  ['NaN', [...triangle.slice(0, 2), { x: NaN, y: 10 }]],
  ['infinite', [triangle[0]!, { x: Infinity, y: 0 }, triangle[2]!]],
])('rejects %s borders without changing history', (_name, points) => {
  const border = usePlotBorderStore();
  expect(border.savePath([[points]])).toBe(false);
  expect(border.path).toEqual([]);
  expect(usePlanCommandHistory().canUndo).toBe(false);
});
it('normalizes either winding, clones geometry and supports undoing removal', () => {
  const border = usePlotBorderStore();
  const path = [[triangle]];
  for (const ring of [triangle, [...triangle].reverse()]) {
    expect(border.savePath([[ring]])).toBe(true);
    expect(border.path).toEqual(path);
  }
  const input = cloneGuildPath(path);
  border.savePath(input);
  input[0]![0]![0]!.x = 100;
  expect(border.path).toEqual(path);
  border.savePath([]);
  expect(border.path).toEqual([]);
  usePlanCommandHistory().undo();
  expect(border.path).toEqual(path);
});
