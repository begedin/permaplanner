import { computed, ref, watch, type Ref } from 'vue';
import simplify from 'simplify-js';
import { useMagicKeys } from '@vueuse/core';

import { joinPaths, subtractPaths, type PathPoint } from './guildPathClip';
import type { AerialTool } from './useAerialTool';
import { useSceneStore } from './useSceneStore';

export const useGuildPathEdit = (options: {
  path: Ref<PathPoint[]>;
  selected: Ref<boolean>;
  tool: Ref<AerialTool | undefined>;
  resetPath: () => void;
  onCommit: () => void;
  onCancel: () => void;
}) => {
  const scene = useSceneStore();
  const { meta } = useMagicKeys();

  const isEditing = computed(
    () => options.selected.value && options.tool.value === 'edit',
  );

  const brushSize = ref(12);
  const stroke = ref<PathPoint[]>([]);
  let editModeController = new AbortController();

  const brush = computed(() => {
    if (!isEditing.value) {
      return [];
    }

    const x = Math.max(scene.worldX, 0);
    const y = Math.max(scene.worldY, 0);
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

  watch(
    () => scene.isDrawing,
    (isDrawing) => {
      if (!isEditing.value) {
        return;
      }

      if (isDrawing) {
        stroke.value = simplify(joinPaths(stroke.value, brush.value));
        return;
      }

      options.path.value = meta.value
        ? subtractPaths(options.path.value, stroke.value)
        : simplify(joinPaths(options.path.value, stroke.value));
      stroke.value = [];
    },
  );

  watch(
    () => [scene.worldX, scene.worldY],
    () => {
      if (!isEditing.value || !scene.isDrawing) {
        return;
      }
      stroke.value = simplify(joinPaths(stroke.value, brush.value));
    },
  );

  watch(
    isEditing,
    (editing) => {
      if (!editing) {
        editModeController.abort();
        stroke.value = [];
        if (options.selected.value) {
          options.resetPath();
        }
        return;
      }

      editModeController = new AbortController();

      document.addEventListener(
        'keydown',
        (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            editModeController.abort();
            options.onCommit();
          }

          if (e.key === 'Escape') {
            e.preventDefault();
            editModeController.abort();
            options.resetPath();
            options.onCancel();
          }

          if (e.key === '+') {
            e.preventDefault();
            Math.min((brushSize.value += 1), 50);
          }

          if (e.key === '-') {
            e.preventDefault();
            Math.max((brushSize.value -= 1), 1);
          }
        },
        { signal: editModeController.signal },
      );
    },
    { immediate: true },
  );

  watch(
    () => options.selected.value,
    (selected) => {
      if (!selected) {
        editModeController.abort();
        stroke.value = [];
        options.resetPath();
      }
    },
  );

  const brushColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.1)' : 'rgba(0, 100, 0, 0.3)',
  );

  const strokeColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.3)' : 'rgba(0, 100, 0, 0.6)',
  );

  return {
    isEditing,
    brush,
    stroke,
    brushColor,
    strokeColor,
  };
};
