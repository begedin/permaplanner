import type { DeepReadonly } from 'vue';
import { computed, ref, watch, type Ref } from 'vue';
import { useEventListener, useMagicKeys } from '@vueuse/core';

import { isEditableTarget } from './keyboardShortcuts';
import {
  cloneGuildPath,
  joinPaths,
  subtractPaths,
  smoothPath,
  simplifyPath,
  type GuildPath,
  type PathPoint,
} from './guildPathClip';
import type { DrawingBrush } from './useAerialTool';
import { usePointerSession } from './usePointerSession';
import { clientToSvgUser } from './svgClientToUser';

export const usePathDrawing = (options: {
  svg: Ref<SVGSVGElement | undefined>;
  savedPath: Ref<DeepReadonly<GuildPath> | undefined>;
  onCommit: (path: GuildPath) => boolean;
  onCancel: () => void;
  drawingBrush: Ref<DrawingBrush>;
}) => {
  const session = usePointerSession();
  const pointer = ref({ x: 0, y: 0 });
  const { meta } = useMagicKeys();

  const isEditing = computed(() => options.savedPath.value !== undefined);
  const path = ref<GuildPath>([]);

  const brushSize = ref(12);
  const stroke = ref<GuildPath>([]);
  const corners = ref<PathPoint[]>([]);
  const drawingBrush = options.drawingBrush;

  const brush = computed(() => {
    if (!isEditing.value) {
      return [];
    }

    const x = pointer.value.x;
    const y = pointer.value.y;
    const totalPoints = 20;
    const theta = (Math.PI * 2) / totalPoints;
    const points: PathPoint[] = [];
    const r = brushSize.value;
    for (let i = 0; i < totalPoints; i++) {
      const angle = theta * i;
      points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
    }
    return points;
  });

  useEventListener(options.svg, 'pointermove', (event: PointerEvent) => {
    if (isEditing.value && options.svg.value)
      pointer.value = clientToSvgUser(options.svg.value, event.clientX, event.clientY);
  });
  useEventListener(options.svg, 'pointerdown', (event: PointerEvent) => {
    const svg = options.svg.value;
    if (!isEditing.value || !svg || event.button !== 0) return;
    const origin = clientToSvgUser(svg, event.clientX, event.clientY);
    if (drawingBrush.value === 'polygon') {
      event.preventDefault();
      const first = corners.value[0];
      const matrix = svg.getScreenCTM();
      const threshold = 7 / Math.hypot(matrix?.a ?? 1, matrix?.b ?? 0);
      if (
        first &&
        corners.value.length >= 3 &&
        Math.hypot(origin.x - first.x, origin.y - first.y) < threshold
      ) {
        finish();
      } else corners.value.push(origin);
      return;
    }
    let last = origin;
    let axisOrigin: PathPoint | undefined;
    let axis: 'x' | 'y' | undefined;
    session.start(event, {
      update: (next) => {
        let point = clientToSvgUser(svg, next.clientX, next.clientY);
        if (drawingBrush.value === 'rectangle') {
          stroke.value = [
            [
              [
                origin,
                { x: point.x, y: origin.y },
                point,
                { x: origin.x, y: point.y },
                origin,
              ],
            ],
          ];
          return;
        }
        if (next.shiftKey) {
          axisOrigin ??= last;
          const dx = Math.abs(point.x - axisOrigin.x);
          const dy = Math.abs(point.y - axisOrigin.y);
          if (!axis && Math.max(dx, dy) > 0) axis = dx >= dy ? 'x' : 'y';
          if (axis)
            point =
              axis === 'x'
                ? { x: point.x, y: axisOrigin.y }
                : { x: axisOrigin.x, y: point.y };
        } else {
          axisOrigin = undefined;
          axis = undefined;
        }
        // Fill gaps between pointer events so a fast stroke stays connected.
        const steps = Math.max(
          1,
          Math.ceil(Math.hypot(point.x - last.x, point.y - last.y) / brushSize.value),
        );
        const stamps: GuildPath = [];
        for (let i = 1; i <= steps; i++) {
          pointer.value = {
            x: last.x + ((point.x - last.x) * i) / steps,
            y: last.y + ((point.y - last.y) * i) / steps,
          };
          stamps.push([brush.value]);
        }
        stroke.value = joinPaths(stroke.value, stamps);
        last = point;
      },
      cancel: () => {
        stroke.value = [];
      },
      commit: () => {
        const finishedStroke =
          drawingBrush.value === 'path'
            ? smoothPath(stroke.value)
            : joinPaths([], stroke.value);
        path.value = simplifyPath(
          meta.value
            ? subtractPaths(path.value, finishedStroke)
            : joinPaths(path.value, finishedStroke),
        );
        stroke.value = [];
      },
    });
  });

  const finish = () => {
    if (corners.value.length && corners.value.length < 3) return;
    const result = corners.value.length
      ? joinPaths(path.value, [[corners.value]])
      : path.value;
    if (!result.length && !options.savedPath.value?.length) return;
    if (!options.onCommit(result)) return;
    session.cancel();
    corners.value = [];
  };

  watch(
    () => [options.savedPath.value, drawingBrush.value] as const,
    ([savedPath]) => {
      session.cancel();
      stroke.value = [];
      corners.value = [];
      path.value = savedPath ? cloneGuildPath(savedPath) : [];
    },
    { immediate: true, flush: 'sync' },
  );
  useEventListener(document, 'keydown', (event) => {
    if (
      !isEditing.value ||
      isEditableTarget(event.target) ||
      event.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return;
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        finish();
        break;
      case 'Escape':
        event.preventDefault();
        session.cancel();
        options.onCancel();
        break;
      case 'Backspace':
        if (drawingBrush.value === 'polygon') {
          event.preventDefault();
          corners.value.pop();
        }
        break;
      case '+':
        event.preventDefault();
        brushSize.value = Math.min(brushSize.value + 1, 50);
        break;
      case '-':
        event.preventDefault();
        brushSize.value = Math.max(brushSize.value - 1, 1);
        break;
    }
  });

  const brushColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.1)' : 'rgba(0, 100, 0, 0.3)',
  );

  const strokeColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.3)' : 'rgba(0, 100, 0, 0.6)',
  );

  return {
    path,
    corners,
    pointer,
    brush,
    stroke,
    brushColor,
    strokeColor,
  };
};
