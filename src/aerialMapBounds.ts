import { inject, shallowRef, type InjectionKey, type Ref } from 'vue';
import type { PathBounds } from './guildPathBounds';
import type { PathPoint } from './guildPathClip';
import { clientToSvgUser } from './svgClientToUser';
import { trackDragMovement } from './usePointerSession';

export type MapSize = Pick<PathBounds, 'width' | 'height'>;
export const defaultMapSize: MapSize = { width: 1000, height: 1000 };
export const aerialMapBoundsKey: InjectionKey<Readonly<Ref<MapSize | undefined>>> =
  Symbol('aerial map bounds');
export const useAerialMapBounds = () =>
  inject(aerialMapBoundsKey, () => shallowRef(defaultMapSize), true);

export const insideMap = ({ x, y }: PathPoint, map: MapSize) =>
  x >= 0 && x <= map.width && y >= 0 && y <= map.height;

export const pointOnMap = ({ x, y }: PathPoint, map: MapSize): PathPoint => ({
  x: Math.max(0, Math.min(x, map.width)),
  y: Math.max(0, Math.min(y, map.height)),
});

export const startMapPointDrag = (
  svg: SVGSVGElement,
  event: PointerEvent,
  point: PathPoint,
  map: MapSize,
) => {
  const origin = clientToSvgUser(svg, event.clientX, event.clientY);
  const moved = trackDragMovement(event);
  return (next: PointerEvent): PathPoint | undefined => {
    if (!moved(next)) return;
    const cursor = clientToSvgUser(svg, next.clientX, next.clientY);
    const result = pointOnMap(
      { x: point.x + (cursor.x - origin.x), y: point.y + (cursor.y - origin.y) },
      map,
    );
    if (result.x !== point.x || result.y !== point.y) return result;
  };
};

export const moveWithinMap = (
  box: PathBounds,
  map: MapSize,
  anchor: PathPoint = box,
  delta?: PathPoint,
): PathPoint => {
  const offset = (
    start: number,
    size: number,
    limit: number,
    grip: number,
    requested: number,
  ) => {
    // Keep an editable point in reach when an existing feature is larger than the map.
    if (size > limit) {
      const end = grip + requested;
      if (!delta && (end < 0 || end > limit)) return limit / 2 - grip;
      return Math.max(0, Math.min(end, limit)) - grip;
    }
    return Math.max(-start, Math.min(requested, limit - size - start));
  };
  return {
    x: offset(box.x, box.width, map.width, anchor.x, delta?.x ?? 0),
    y: offset(box.y, box.height, map.height, anchor.y, delta?.y ?? 0),
  };
};
