<script lang="ts" setup>
  import { computed, ref, toRef, watch } from 'vue';

  import type { Guild } from './gardenTypes';
  import GardenMeasure from './GardenMeasure.vue';
  import { pathBounds } from './guildPathBounds';
  import type { PathPoint } from './guildPathClip';
  import type { AerialTool } from './useAerialTool';
  import { useGuildPathEdit } from './useGuildPathEdit';
  import { useGuildPathMove } from './useGuildPathMove';

  const props = defineProps<{
    unitLengthPx: number;
    guild: Guild;
    hovered: boolean;
    selected: boolean;
    tool?: AerialTool;
  }>();

  const emit = defineEmits<{
    (e: 'update' | 'move', path: PathPoint[]): void;
    (e: 'cancel' | 'click' | 'mouseenter' | 'mouseleave'): void;
    (e: 'click', evt: MouseEvent): void;
  }>();

  const path = ref<PathPoint[]>([]);

  const resetPath = () => {
    path.value = [...props.guild.path];
  };

  watch(() => props.guild, resetPath, { immediate: true });

  const selected = toRef(props, 'selected');
  const tool = toRef(props, 'tool');

  const { isEditing, brush, stroke, brushColor, strokeColor } = useGuildPathEdit({
    path,
    selected,
    tool,
    resetPath,
    onCommit: () => emit('update', [...path.value]),
    onCancel: () => emit('cancel'),
  });

  const { isMoving, onPathMouseDown } = useGuildPathMove({
    path,
    selected,
    tool,
    onCommit: () => emit('move', [...path.value]),
  });

  const box = computed(() => {
    if (path.value.length === 0) {
      return null;
    }
    return pathBounds(path.value);
  });
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
