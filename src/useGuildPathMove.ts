import { computed, watch, type Ref } from 'vue';
import type { PathPoint } from './guildPathClip';
import { clientToSvgUser } from './svgClientToUser';
import type { AerialTool } from './useAerialTool';
import { useSceneStore } from './useSceneStore';
import { usePointerSession } from './usePointerSession';

export const useGuildPathMove = (options: {
  path: Ref<PathPoint[]>;
  selected: Ref<boolean>;
  tool: Ref<AerialTool | undefined>;
  onCommit: () => void;
}) => {
  const scene = useSceneStore();
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
    const origin =
      svg instanceof SVGSVGElement
        ? clientToSvgUser(svg, event.clientX, event.clientY)
        : { x: scene.worldX, y: scene.worldY };
    const path = options.path.value.map((point) => ({ ...point }));
    session.start(event, {
      update: (next) => {
        const point =
          svg instanceof SVGSVGElement
            ? clientToSvgUser(svg, next.clientX, next.clientY)
            : { x: scene.worldX, y: scene.worldY };
        options.path.value = path.map(({ x, y }) => ({
          x: x + point.x - origin.x,
          y: y + point.y - origin.y,
        }));
      },
      cancel: () => {
        options.path.value = path;
      },
      commit: options.onCommit,
    });
  };

  return { isMoving, onPathPointerDown };
};
