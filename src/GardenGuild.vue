<script lang="ts" setup>
  import type { DeepReadonly } from 'vue';
  import { computed, ref, toRef, watch } from 'vue';

  import type { Guild } from './gardenTypes';
  import { useCameraStore } from './useCameraStore';
  import GardenMeasure from './GardenMeasure.vue';
  import { pathBounds } from './guildPathBounds';
  import { cloneGuildPath, guildPathData, type GuildPath } from './guildPathClip';
  import type { AerialTool } from './useAerialTool';
  import { useGuildPathMove } from './useGuildPathMove';

  const props = withDefaults(
    defineProps<{
      previewPath?: GuildPath;
      unitLengthPx: number;
      guild: DeepReadonly<Guild>;
      hovered: boolean;
      selected: boolean;
      tool?: AerialTool;
      showLabel?: boolean;
    }>(),
    { showLabel: true },
  );
  const camera = useCameraStore();
  const labelScale = computed(() => 1 / (camera.scale * camera.zoom || 1));

  const emit = defineEmits<{
    (e: 'move', path: GuildPath): void;
    (e: 'mouseenter' | 'mouseleave'): void;
    (e: 'click', evt: MouseEvent): void;
  }>();

  const path = ref<GuildPath>([]);

  watch(
    () => props.previewPath ?? props.guild.path,
    (points) => {
      path.value = cloneGuildPath(points);
    },
    { immediate: true },
  );

  const selected = toRef(props, 'selected');
  const tool = toRef(props, 'tool');

  const { isMoving, onPathPointerDown } = useGuildPathMove({
    path,
    selected,
    tool,
    onCommit: () => emit('move', [...path.value]),
  });

  const outline = computed(() => guildPathData(path.value));

  const box = computed(() => {
    if (path.value.length === 0) {
      return null;
    }
    return pathBounds(path.value.flat(2));
  });
</script>
<template>
  <path
    v-if="path.length > 0"
    :d="outline"
    fill-rule="evenodd"
    :fill="
      selected
        ? 'rgba(0, 100, 0, 0.6)'
        : hovered
          ? 'rgba(0, 100, 0, 0.3)'
          : 'rgba(0, 100, 0, 0.2)'
    "
    :class="['pointer-events-fill', isMoving ? 'cursor-move' : undefined]"
    @pointerdown="onPathPointerDown"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
    @click="emit('click', $event)"
  />
  <path
    :d="outline"
    stroke="black"
    fill="none"
    class="pointer-events-none"
  />
  <text
    v-if="box && showLabel"
    :x="box.x + box.width / 2"
    :y="box.y + box.height / 2"
    text-anchor="middle"
    dominant-baseline="middle"
    class="pointer-events-none font-serif"
    :font-size="camera.mapLabelFontSize"
    :stroke-width="2 * labelScale"
    stroke="#faf6eb"
    fill="#463c2c"
    paint-order="stroke"
    stroke-linejoin="round"
    >{{ guild.name }}</text
  >
  <GardenMeasure
    v-if="box && (hovered || selected)"
    :unit-length-px="unitLengthPx"
    :box="box"
  />

  <slot name="features" />
</template>
