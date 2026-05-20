import { expect, it } from 'vitest';

import { formatGuildMapDimensions, pathBounds } from './guildPathBounds';

it('pathBounds returns zero size for an empty path', () => {
  expect(pathBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
});

it('pathBounds uses the axis-aligned bounding box', () => {
  expect(
    pathBounds([
      { x: 10, y: 20 },
      { x: 50, y: 80 },
      { x: 30, y: 40 },
    ]),
  ).toEqual({
    x: 10,
    y: 20,
    width: 40,
    height: 60,
  });
});

it('formatGuildMapDimensions matches map measure units', () => {
  expect(formatGuildMapDimensions({ x: 0, y: 0, width: 130, height: 100 }, 130)).toBe(
    '1.00×0.77',
  );
});

it('formatGuildMapDimensions returns null when scale is unset', () => {
  expect(formatGuildMapDimensions({ x: 0, y: 0, width: 10, height: 10 }, 0)).toBeNull();
});
