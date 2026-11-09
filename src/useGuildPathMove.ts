import { computed, watch, type Ref } from 'vue';
import type { GuildPath } from './guildPathClip';
import { clientToSvgUser } from './svgClientToUser';
import type { AerialTool } from './useAerialTool';
import { usePointerSession } from './usePointerSession';

export const useGuildPathMove = (options: {
  path: Ref<GuildPath>;
  selected: Ref<boolean>;
  tool: Ref<AerialTool | undefined>;
  onCommit: () => void;
}) => {
  const session = usePointerSession();
  const isMoving = computed(
    () => options.selected.value && options.tool.value === 'move',
  );
  watch(
    isMoving,
    (moving) => {
      if (!moving) session.cancel();
    },
    { flush: 'sync' },
  );

  const onPathPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !isMoving.value || options.path.value.length === 0) return;
    session.cancel();
    const svg = (event.currentTarget as SVGElement).closest('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    const origin = clientToSvgUser(svg, event.clientX, event.clientY);
    const path = options.path.value;
    session.start(event, {
      update: (next) => {
        const point = clientToSvgUser(svg, next.clientX, next.clientY);
        options.path.value = path.map((polygon) =>
          polygon.map((ring) =>
            ring.map(({ x, y }) => ({
              x: x + point.x - origin.x,
              y: y + point.y - origin.y,
            })),
          ),
        );
      },
      cancel: () => {
        options.path.value = path;
      },
      commit: options.onCommit,
    });
  };

  return { isMoving, onPathPointerDown };
};
