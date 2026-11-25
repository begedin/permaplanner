import { computed, watch, type Ref } from 'vue';
import { moveWithinMap, type MapSize } from './aerialMapBounds';
import { pathBounds } from './guildPathBounds';
import { translatePath, type GuildPath } from './guildPathClip';
import { clientToSvgUser } from './svgClientToUser';
import type { AerialTool } from './useAerialTool';
import { trackDragMovement, usePointerSession } from './usePointerSession';

export const useGuildPathMove = (options: {
  path: Ref<GuildPath>;
  worldBounds: Readonly<Ref<MapSize | undefined>>;
  selected: Ref<boolean>;
  tool: Ref<AerialTool | undefined>;
  onCommit: () => void;
}) => {
  const session = usePointerSession();
  const isMoving = computed(
    () => options.selected.value && options.tool.value === 'move',
  );
  watch([isMoving, options.worldBounds], session.cancel, { flush: 'sync' });

  const onPathPointerDown = (event: PointerEvent) => {
    const map = options.worldBounds.value;
    if (!map || event.button !== 0 || !isMoving.value || options.path.value.length === 0)
      return;
    session.cancel();
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    const origin = clientToSvgUser(svg, event.clientX, event.clientY);
    const moved = trackDragMovement(event);
    const path = options.path.value;
    const bounds = pathBounds(path.flat(2));
    session.start(event, {
      update: (next) => {
        if (!moved(next)) {
          options.path.value = path;
          return;
        }
        const point = clientToSvgUser(svg, next.clientX, next.clientY);
        const delta = moveWithinMap(bounds, map, origin, {
          x: point.x - origin.x,
          y: point.y - origin.y,
        });
        options.path.value = translatePath(path, delta);
      },
      cancel: () => {
        options.path.value = path;
      },
      commit: () => {
        if (options.path.value !== path) options.onCommit();
      },
    });
  };

  return { isMoving, onPathPointerDown };
};
