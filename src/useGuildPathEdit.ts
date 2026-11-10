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
import type { Guild } from './gardenTypes';
import { usePointerSession } from './usePointerSession';
import { clientToSvgUser } from './svgClientToUser';

export const useGuildPathEdit = (options: {
  svg: Ref<SVGSVGElement | undefined>;
  guild: Ref<DeepReadonly<Guild> | undefined>;
  onCommit: (guildId: string, path: GuildPath) => void;
  onCancel: () => void;
}) => {
  const session = usePointerSession();
  const pointer = ref({ x: 0, y: 0 });
  const { meta } = useMagicKeys();

  const isEditing = computed(() => options.guild.value !== undefined);
  const path = ref<GuildPath>([]);

  const brushSize = ref(12);
  const stroke = ref<GuildPath>([]);

  const brush = computed(() => {
    if (!isEditing.value) {
      return [];
    }

    const x = Math.max(pointer.value.x, 0);
    const y = Math.max(pointer.value.y, 0);
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
    session.start(event, {
      update: (next) => {
        pointer.value = clientToSvgUser(svg, next.clientX, next.clientY);
        stroke.value = joinPaths(stroke.value, [[brush.value]]);
      },
      cancel: () => {
        stroke.value = [];
      },
      commit: () => {
        const finishedStroke = smoothPath(stroke.value);
        path.value = simplifyPath(
          meta.value
            ? subtractPaths(path.value, finishedStroke)
            : joinPaths(path.value, finishedStroke),
        );
        stroke.value = [];
      },
    });
  });

  watch(
    () => [options.guild.value?.id, options.guild.value?.path] as const,
    ([guildId, savedPath], _previous, onCleanup) => {
      session.cancel();
      stroke.value = [];
      path.value = savedPath ? cloneGuildPath(savedPath) : [];
      if (guildId === undefined || !savedPath) return;

      const editModeController = new AbortController();
      onCleanup(() => editModeController.abort());

      document.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if (
            !isEditing.value ||
            isEditableTarget(e.target) ||
            e.isComposing ||
            e.metaKey ||
            e.ctrlKey ||
            e.altKey
          ) {
            return;
          }

          if (e.key === 'Enter') {
            e.preventDefault();
            editModeController.abort();
            session.cancel();
            options.onCommit(guildId, [...path.value]);
          }

          if (e.key === 'Escape') {
            e.preventDefault();
            editModeController.abort();
            session.cancel();
            path.value = cloneGuildPath(savedPath);
            options.onCancel();
          }

          if (e.key === '+') {
            e.preventDefault();
            brushSize.value = Math.min(brushSize.value + 1, 50);
          }

          if (e.key === '-') {
            e.preventDefault();
            brushSize.value = Math.max(brushSize.value - 1, 1);
          }
        },
        { signal: editModeController.signal },
      );
    },
    { immediate: true, flush: 'sync' },
  );

  const brushColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.1)' : 'rgba(0, 100, 0, 0.3)',
  );

  const strokeColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.3)' : 'rgba(0, 100, 0, 0.6)',
  );

  return {
    path,
    brush,
    stroke,
    brushColor,
    strokeColor,
  };
};
