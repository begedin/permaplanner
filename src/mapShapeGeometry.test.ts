import {
  fitShapeRotation,
  shapeFromPath,
  shapeMapPoints,
  rectangleShapePath,
  startShapeDrag,
  SHAPE_RESIZE_HANDLES,
} from './mapShapeGeometry';
import { expect, it } from 'vitest';
const map = { width: 1000, height: 1000 };

const house = {
  id: 'house',
  name: 'House',
  x: 100,
  y: 50,
  width: 80,
  height: 60,
  rotation: 0,
  path: rectangleShapePath(),
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
  const direction = SHAPE_RESIZE_HANDLES.find((handle) => handle.name === name)!;
  expect(
    startShapeDrag(
      { kind: 'resize', shape: house, direction },
      { x: 100, y: 50 },
      7,
      map,
    )({ x: 110, y: 70 }),
  ).toEqual({ ...house, ...expected });
});

it('resizes in local axes without moving the opposite rotated edge', () => {
  expect(
    startShapeDrag(
      { kind: 'resize', shape: { ...house, rotation: 30 }, direction: { x: 1, y: 0 } },
      { x: 100, y: 50 },
      7,
      map,
    )({ x: 100 + 10 * Math.sqrt(3), y: 60 }),
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
  const result = shapeFromPath('new', 'New shape', path);
  expect(result).toMatchObject({
    id: 'new',
    name: 'New shape',
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

it('slides a corner along the map boundary and keeps the opposite corner fixed', () => {
  const drag = startShapeDrag(
    { kind: 'resize', shape: house, direction: { x: 1, y: 1 } },
    { x: 140, y: 80 },
    7,
    { width: 200, height: 100 },
  );
  expect(drag({ x: 160, y: 180 })).toMatchObject({
    x: 110,
    y: 60,
    width: 100,
    height: 80,
  });
  expect(drag({ x: 140, y: 90 })).toMatchObject({ x: 100, y: 55, width: 80, height: 70 });
});

it('rotates and resizes a diamond to the map edge using its outline', () => {
  const shape = shapeFromPath('diamond', 'Diamond', [
    [
      [
        { x: 500, y: 75 },
        { x: 925, y: 500 },
        { x: 500, y: 925 },
        { x: 75, y: 500 },
        { x: 500, y: 75 },
      ],
    ],
  ]);
  const rotated = fitShapeRotation(shape, 45, map)!;
  expect(rotated).toEqual({ ...shape, rotation: 45 });
  const resize = startShapeDrag(
    { kind: 'resize', shape: rotated, direction: { x: 1, y: 1 } },
    { x: 0, y: 0 },
    7,
    map,
  );
  const enlarged = resize({ x: 0, y: 1000 });
  expect(enlarged.width).toBeGreaterThan(rotated.width);
  expect(enlarged.height).toBeCloseTo(enlarged.width);
  expect(Math.max(...shapeMapPoints(enlarged).map((point) => point.y))).toBeCloseTo(
    map.height,
  );
});

it('slides a rotated corner along the bottom edge while its opposite stays fixed', () => {
  const shape = {
    ...house,
    x: 500,
    y: 1000 - 50 * Math.SQRT2,
    width: 100,
    height: 100,
    rotation: 45,
  };
  const points = shapeMapPoints(shape);
  const corner = points[2]!;
  const drag = startShapeDrag(
    { kind: 'resize', shape, direction: { x: 1, y: 1 } },
    corner,
    7,
    map,
  );
  const resized = shapeMapPoints(drag({ x: corner.x + 30, y: corner.y + 3 }));
  expect(resized[0]).toMatchObject({
    x: expect.closeTo(points[0]!.x),
    y: expect.closeTo(points[0]!.y),
  });
  expect(resized[2]).toMatchObject({ x: expect.closeTo(530), y: expect.closeTo(1000) });
});
