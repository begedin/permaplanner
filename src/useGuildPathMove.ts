import { computed, ref, watch, type Ref } from 'vue';

import type { PathPoint } from './guildPathClip';
import { clientToSvgUser } from './svgClientToUser';
import type { AerialTool } from './useAerialTool';
import { useSceneStore } from './useSceneStore';

export const useGuildPathMove = (options: {
  path: Ref<PathPoint[]>;
  selected: Ref<boolean>;
  tool: Ref<AerialTool | undefined>;
  onCommit: () => void;
}) => {
  const scene = useSceneStore();

  const isMoving = computed(
    () => options.selected.value && options.tool.value === 'move',
  );

  let moveController = new AbortController();
  const moveOrigin = ref<{
    worldX: number;
    worldY: number;
    path: PathPoint[];
  } | null>(null);

  watch(
    () => options.selected.value,
    (selected) => {
      if (!selected) {
        moveController.abort();
        moveOrigin.value = null;
      }
    },
  );

  watch(isMoving, (moving) => {
    if (!moving) {
      moveController.abort();
      moveOrigin.value = null;
    }
  });

  const onPathMouseDown = (e: MouseEvent) => {
    if (!isMoving.value || options.path.value.length === 0) {
      return;
    }

    e.stopPropagation();
    moveController.abort();
    moveController = new AbortController();
    const svg = (e.currentTarget as SVGElement).closest('svg');
    const origin =
      svg instanceof SVGSVGElement
        ? clientToSvgUser(svg, e.clientX, e.clientY)
        : { x: scene.worldX, y: scene.worldY };
    moveOrigin.value = {
      worldX: origin.x,
      worldY: origin.y,
      path: options.path.value.map((point) => ({ ...point })),
    };

    const applyMove = (clientX: number, clientY: number) => {
      if (!moveOrigin.value) {
        return;
      }
      const current =
        svg instanceof SVGSVGElement
          ? clientToSvgUser(svg, clientX, clientY)
          : { x: scene.worldX, y: scene.worldY };
      const dx = current.x - moveOrigin.value.worldX;
      const dy = current.y - moveOrigin.value.worldY;
      options.path.value = moveOrigin.value.path.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      }));
    };

    const finishMove = () => {
      if (!moveOrigin.value) {
        return;
      }
      moveController.abort();
      options.onCommit();
      moveOrigin.value = null;
    };

    document.addEventListener(
      'mousemove',
      (moveE) => {
        if ((moveE.buttons & 1) === 0) {
          applyMove(moveE.clientX, moveE.clientY);
          finishMove();
          return;
        }
        applyMove(moveE.clientX, moveE.clientY);
      },
      { signal: moveController.signal },
    );

    document.addEventListener(
      'mouseup',
      (upE) => {
        if (!moveOrigin.value) {
          return;
        }
        applyMove(upE.clientX, upE.clientY);
        finishMove();
      },
      { signal: moveController.signal },
    );
  };

  return {
    isMoving,
    onPathMouseDown,
  };
};
