<script lang="ts" setup>
  import { computed, ref, watch } from 'vue';
  import simplify from 'simplify-js';
  import clipping from 'polygon-clipping';

  import { type Guild } from './useGardenStore';
  import GardenMeasure from './GardenMeasure.vue';
  import { useSceneStore } from './useSceneStore';
  import { useMagicKeys } from '@vueuse/core';
  import type { AerialTool } from './useAerialTool';
  import { clientToSvgUser } from './svgClientToUser';

  const props = defineProps<{
    unitLengthPx: number;
    guild: Guild;
    hovered: boolean;
    selected: boolean;
    tool?: AerialTool;
  }>();

  const emit = defineEmits<{
    (e: 'update', guild: Guild): void;
    (e: 'move', guild: Guild): void;
    (e: 'cancel' | 'click' | 'mouseenter' | 'mouseleave'): void;
    (e: 'click', evt: MouseEvent): void;
  }>();

  const resetPath = () => {
    path.value = [...props.guild.path];
  };

  const path = ref<{ x: number; y: number }[]>([]);

  watch(() => props.guild, resetPath, { immediate: true });

  const isEditing = computed(() => props.selected && props.tool === 'edit');
  const isMoving = computed(() => props.selected && props.tool === 'move');

  const brushSize = ref(12);

  const brush = computed(() => {
    if (!isEditing.value) {
      return [];
    }

    const x = Math.max(scene.worldX, 0);
    const y = Math.max(scene.worldY, 0);
    const totalPoints = 20;
    const theta = (Math.PI * 2) / totalPoints;
    const points: { x: number; y: number }[] = [];
    const r = brushSize.value;
    for (let i = 0; i < totalPoints; i++) {
      const angle = theta * i;
      points.push({ x: x + r * Math.cos(angle), y: y + r * Math.sin(angle) });
    }

    return points;
  });

  let editModeController = new AbortController();
  let moveController = new AbortController();

  const stroke = ref<{ x: number; y: number }[]>([]);
  const moveOrigin = ref<{
    worldX: number;
    worldY: number;
    path: { x: number; y: number }[];
  } | null>(null);

  const joinPaths = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
    return a.length > 0
      ? clipping
          .union(
            [a.map(({ x, y }) => [x, y] as [number, number])],
            [b.map(({ x, y }) => [x, y] as [number, number])],
          )
          .map((polygon) => polygon.map((path) => path.map(([x, y]) => ({ x, y }))))
          .flat()
          .flat()
      : b;
  };

  const subtractPaths = (
    a: { x: number; y: number }[],
    b: { x: number; y: number }[],
  ) => {
    return a.length > 0
      ? clipping
          .difference(
            [a.map(({ x, y }) => [x, y] as [number, number])],
            [b.map(({ x, y }) => [x, y] as [number, number])],
          )
          .map((polygon) => polygon.map((path) => path.map(([x, y]) => ({ x, y }))))
          .flat()
          .flat()
      : a;
  };

  const scene = useSceneStore();
  const { meta } = useMagicKeys();

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

      if (!isDrawing) {
        path.value = meta.value
          ? subtractPaths(path.value, stroke.value)
          : simplify(joinPaths(path.value, stroke.value));
        stroke.value = [];
        return;
      }
    },
  );

  watch(
    () => [scene.worldX, scene.worldY],
    () => {
      if (!isEditing.value) {
        return;
      }

      if (scene.isDrawing) {
        stroke.value = simplify(joinPaths(stroke.value, brush.value));
      }
    },
  );

  watch(
    isEditing,
    (editing) => {
      if (!editing) {
        editModeController.abort();
        stroke.value = [];
        if (props.selected) {
          resetPath();
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
            emit('update', {
              ...props.guild,
              path: [...path.value],
            });
          }

          if (e.key === 'Escape') {
            e.preventDefault();
            editModeController.abort();
            resetPath();
            emit('cancel');
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
    () => props.selected,
    (selected) => {
      if (!selected) {
        editModeController.abort();
        moveController.abort();
        stroke.value = [];
        moveOrigin.value = null;
        resetPath();
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
    if (!isMoving.value || path.value.length === 0) {
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
      path: path.value.map((point) => ({ ...point })),
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
      path.value = moveOrigin.value.path.map((point) => ({
        x: point.x + dx,
        y: point.y + dy,
      }));
    };

    const finishMove = () => {
      if (!moveOrigin.value) {
        return;
      }
      moveController.abort();
      emit('move', {
        ...props.guild,
        path: [...path.value],
      });
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

  const box = computed(() => {
    if (path.value.length === 0) {
      return null;
    }
    const minX = Math.min(...path.value.map(({ x }) => x));
    const minY = Math.min(...path.value.map(({ y }) => y));
    const maxX = Math.max(...path.value.map(({ x }) => x));
    const maxY = Math.max(...path.value.map(({ y }) => y));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  });

  const brushColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.1)' : 'rgba(0, 100, 0, 0.3)',
  );

  const strokeColor = computed(() =>
    meta.value ? 'rgba(100, 0, 0, 0.3)' : 'rgba(0, 100, 0, 0.6)',
  );
</script>
<template>
  <polygon
    v-if="stroke.length > 0"
    :points="stroke.map(({ x, y }) => `${x},${y}`).join(' ')"
    :fill="strokeColor"
    class="pointer-events-none"
  />
  <polygon
    v-else-if="isEditing"
    :points="brush.map(({ x, y }) => `${x},${y}`).join(' ')"
    :fill="brushColor"
    class="pointer-events-none"
  />

  <polygon
    v-if="path.length > 0"
    ref="pathEl"
    :points="path.map(({ x, y }) => `${x},${y}`).join(' ')"
    :fill="
      selected
        ? 'rgba(0, 100, 0, 0.6)'
        : hovered
          ? 'rgba(0, 100, 0, 0.3)'
          : 'rgba(0, 100, 0, 0.2)'
    "
    stroke="black"
    :class="['pointer-events-fill', isMoving ? 'cursor-move' : undefined]"
    @mousedown="onPathMouseDown"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
    @click="emit('click', $event)"
  />
  <GardenMeasure
    v-if="box && (hovered || selected)"
    :unit-length-px="unitLengthPx"
    :box="box"
  />

  <slot name="features" />
</template>
