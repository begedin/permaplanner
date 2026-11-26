import { moveWithinMap, type MapSize } from './aerialMapBounds';
import { compileResizeLimits, type ResizeLimit } from './shapeResizeLimits';
import { pathBounds } from './guildPathBounds';
import type { GuildPath, PathPoint } from './guildPathClip';
import type { MapShape } from './gardenDocument';

type ResizeDirection = { x: -1 | 0 | 1; y: -1 | 0 | 1 };
export type ShapeGesture =
  | { kind: 'move'; shape: MapShape }
  | { kind: 'rotate'; shape: MapShape }
  | { kind: 'resize'; shape: MapShape; direction: ResizeDirection };

export const SHAPE_RESIZE_HANDLES = [
  { name: 'top', x: 0, y: -1, angle: 90 },
  { name: 'right', x: 1, y: 0, angle: 0 },
  { name: 'bottom', x: 0, y: 1, angle: 90 },
  { name: 'left', x: -1, y: 0, angle: 0 },
  { name: 'top-left', x: -1, y: -1, angle: 45 },
  { name: 'top-right', x: 1, y: -1, angle: 135 },
  { name: 'bottom-right', x: 1, y: 1, angle: 45 },
  { name: 'bottom-left', x: -1, y: 1, angle: 135 },
] as const;

export const SHAPE_RESIZE_EDGES = SHAPE_RESIZE_HANDLES.filter(
  (handle) => handle.x === 0 || handle.y === 0,
);

export const shapeMapPoints = (shape: MapShape): PathPoint[] => {
  const angle = (shape.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return shape.path.flat(2).map((point) => {
    const x = point.x * shape.width;
    const y = point.y * shape.height;
    return { x: shape.x + cos * x - sin * y, y: shape.y + sin * x + cos * y };
  });
};

export const fitShapeRotation = (
  shape: MapShape,
  rotation: number,
  map: MapSize,
  originalBounds = pathBounds(shapeMapPoints(shape)),
): MapShape | undefined => {
  const rotated = { ...shape, rotation: ((rotation % 360) + 360) % 360 };
  const points = shapeMapPoints(rotated);
  const bounds = pathBounds(points);
  if (
    bounds.width > Math.max(map.width, originalBounds.width) + 1e-8 ||
    bounds.height > Math.max(map.height, originalBounds.height) + 1e-8
  )
    return;
  const delta = moveWithinMap(bounds, map, points[0]);
  return { ...rotated, x: rotated.x + delta.x, y: rotated.y + delta.y };
};

export const startShapeDrag = (
  gesture: ShapeGesture,
  origin: PathPoint,
  minimumSize: number,
  map: MapSize,
) => {
  const original = gesture.shape;
  const points = shapeMapPoints(original);
  const bounds = pathBounds(points);
  if (gesture.kind === 'move') {
    return (point: PathPoint) => {
      const delta = moveWithinMap(bounds, map, origin, {
        x: point.x - origin.x,
        y: point.y - origin.y,
      });
      return { ...original, x: original.x + delta.x, y: original.y + delta.y };
    };
  }
  if (gesture.kind === 'rotate') {
    let lastRotation = original;
    return (point: PathPoint) => {
      const delta =
        Math.atan2(point.y - original.y, point.x - original.x) -
        Math.atan2(origin.y - original.y, origin.x - original.x);
      lastRotation =
        fitShapeRotation(
          original,
          original.rotation + (delta * 180) / Math.PI,
          map,
          bounds,
        ) ?? lastRotation;
      return lastRotation;
    };
  }
  const { direction } = gesture;
  const angle = (original.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle)) < 1e-12 ? 0 : Math.cos(angle);
  const sin = Math.abs(Math.sin(angle)) < 1e-12 ? 0 : Math.sin(angle);
  const limits: ResizeLimit[] = [
    { w: -1, h: 0, limit: Math.max(0, original.width - minimumSize) },
    { w: 0, h: -1, limit: Math.max(0, original.height - minimumSize) },
  ];
  const boundAxis = (w: number, h: number, start: number, end: number) => {
    const length = Math.hypot(w, h);
    if (length < 1e-12) return;
    // An existing off-map vertex can move back toward the map.
    limits.push(
      { w: w / length, h: h / length, limit: Math.max(0, end - start) / length },
      { w: -w / length, h: -h / length, limit: Math.max(0, start) / length },
    );
  };
  for (const [i, local] of original.path.flat(2).entries()) {
    const x = direction.x === 0 ? 0 : local.x + direction.x / 2;
    const y = direction.y === 0 ? 0 : local.y + direction.y / 2;
    const start = points[i]!;
    boundAxis(cos * x, -sin * y, start.x, map.width);
    boundAxis(sin * x, cos * y, start.y, map.height);
  }
  const nearestResize = compileResizeLimits(limits);
  return (point: PathPoint): MapShape => {
    const dx = point.x - origin.x;
    const dy = point.y - origin.y;
    const delta = nearestResize(
      direction.x * (cos * dx + sin * dy),
      direction.y * (-sin * dx + cos * dy),
    );
    return {
      ...original,
      x:
        original.x +
        (cos * direction.x * delta.width - sin * direction.y * delta.height) / 2,
      y:
        original.y +
        (sin * direction.x * delta.width + cos * direction.y * delta.height) / 2,
      width: original.width + delta.width,
      height: original.height + delta.height,
    };
  };
};

export const rectangleShapePath = (): GuildPath => [
  [
    [
      { x: -0.5, y: -0.5 },
      { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 },
      { x: -0.5, y: 0.5 },
      { x: -0.5, y: -0.5 },
    ],
  ],
];

export const shapeFromPath = (id: string, name: string, path: GuildPath): MapShape => {
  const bounds = pathBounds(path.flat(2));
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  return {
    id,
    name,
    x,
    y,
    width: bounds.width,
    height: bounds.height,
    rotation: 0,
    path: path.map((polygon) =>
      polygon.map((ring) =>
        ring.map((point) => ({
          x: (point.x - x) / bounds.width,
          y: (point.y - y) / bounds.height,
        })),
      ),
    ),
  };
};
