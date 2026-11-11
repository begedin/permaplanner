import { landmarkFromPath, rectangleLandmarkPath } from './landmarkGeometry';
import { expect, it } from 'vitest';
import { landmarkAtPointer, LANDMARK_RESIZE_HANDLES } from './landmarkGeometry';

const house = {
  id: 'house',
  name: 'House',
  x: 100,
  y: 50,
  width: 80,
  height: 60,
  rotation: 0,
  path: rectangleLandmarkPath(),
};

it.each([
  ['top', { x: 100, y: 60, width: 80, height: 40 }],
  ['right', { x: 105, y: 50, width: 90, height: 60 }],
  ['bottom', { x: 100, y: 60, width: 80, height: 80 }],
  ['left', { x: 105, y: 50, width: 70, height: 60 }],
  ['top-left', { x: 105, y: 60, width: 70, height: 40 }],
  ['top-right', { x: 105, y: 60, width: 90, height: 40 }],
  ['bottom-right', { x: 105, y: 60, width: 90, height: 80 }],
  ['bottom-left', { x: 105, y: 60, width: 70, height: 80 }],
])('anchors the opposite side when resizing %s', (name, expected) => {
  const direction = LANDMARK_RESIZE_HANDLES.find((handle) => handle.name === name)!;
  expect(
    landmarkAtPointer(
      { kind: 'resize', landmark: house, direction },
      { x: 100, y: 50 },
      { x: 110, y: 70 },
      7,
    ),
  ).toEqual({ ...house, ...expected });
});

it('resizes in local axes without moving the opposite rotated edge', () => {
  expect(
    landmarkAtPointer(
      { kind: 'resize', landmark: { ...house, rotation: 30 }, direction: { x: 1, y: 0 } },
      { x: 100, y: 50 },
      { x: 100 + 10 * Math.sqrt(3), y: 60 },
      7,
    ),
  ).toMatchObject({
    x: expect.closeTo(100 + 5 * Math.sqrt(3)),
    y: expect.closeTo(55),
    width: expect.closeTo(100),
    height: 60,
    rotation: 30,
  });
});

it('normalizes an arbitrary landmark path without changing its map bounds', () => {
  const path = [
    [
      [
        { x: 40, y: 20 },
        { x: 100, y: 20 },
        { x: 100, y: 100 },
        { x: 40, y: 20 },
      ],
    ],
  ];
  const result = landmarkFromPath('new', path);
  expect(result).toMatchObject({
    id: 'new',
    x: 70,
    y: 60,
    width: 60,
    height: 80,
    rotation: 0,
  });
  expect(
    result.path.map((polygon) =>
      polygon.map((ring) =>
        ring.map((p) => ({
          x: result.x + p.x * result.width,
          y: result.y + p.y * result.height,
        })),
      ),
    ),
  ).toEqual(path);
});
