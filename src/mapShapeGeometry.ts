import { pathBounds } from './guildPathBounds';
import type { GuildPath } from './guildPathClip';
import type { MapShape } from './gardenDocument';
import type { PathPoint } from './guildPathClip';

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

export const shapeAtPointer = (
  gesture: ShapeGesture,
  origin: PathPoint,
  point: PathPoint,
  minimumSize: number,
): MapShape => {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const original = gesture.shape;
  if (gesture.kind === 'move')
    return { ...original, x: original.x + dx, y: original.y + dy };
  if (gesture.kind === 'rotate') {
    const delta =
      Math.atan2(point.y - original.y, point.x - original.x) -
      Math.atan2(origin.y - original.y, origin.x - original.x);
    return {
      ...original,
      rotation: (((original.rotation + (delta * 180) / Math.PI) % 360) + 360) % 360,
    };
  }
  const angle = (original.rotation * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const localX = cos * dx + sin * dy;
  const localY = -sin * dx + cos * dy;
  const width = Math.max(
    Math.min(original.width, minimumSize),
    original.width + gesture.direction.x * localX,
  );
  const height = Math.max(
    Math.min(original.height, minimumSize),
    original.height + gesture.direction.y * localY,
  );
  const shiftX = (gesture.direction.x * (width - original.width)) / 2;
  const shiftY = (gesture.direction.y * (height - original.height)) / 2;
  return {
    ...original,
    width,
    height,
    x: original.x + cos * shiftX - sin * shiftY,
    y: original.y + sin * shiftX + cos * shiftY,
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
