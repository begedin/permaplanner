<script lang="ts" setup>
  import type { DeepReadonly } from 'vue';
  import { computed, ref, toRef, watch } from 'vue';

  import { hasPlantPlacement } from './gardenTypes';
  import type { Guild } from './gardenTypes';
  import { useCameraStore } from './useCameraStore';
  import PlantMapLabel from './PlantMapLabel.vue';
  import PlantCanopy from './PlantCanopy.vue';
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
      showPlantLabels?: boolean;
    }>(),
    { showLabel: true },
  );
  const camera = useCameraStore();
  const labeledPlants = computed(() =>
    props.showPlantLabels && camera.isFullyZoomed
      ? props.guild.plants.filter(
          (thing) =>
            hasPlantPlacement(thing) &&
            Math.min(thing.width, thing.height) * camera.scale * camera.zoom >= 24,
        )
      : [],
  );
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
  const plantPreviewTransform = computed(() => {
    if (!isMoving.value || !box.value || !props.guild.path.length) return undefined;
    const saved = pathBounds(props.guild.path.flat(2));
    return `translate(${box.value.x - saved.x} ${box.value.y - saved.y})`;
  });
</script>
<template>
  <path
    v-if="path.length > 0"
    :d="outline"
    fill-rule="evenodd"
    :fill="
      selected
        ? 'rgba(0, 100, 0, 0.38)'
        : hovered
          ? 'rgba(0, 100, 0, 0.195)'
          : 'rgba(0, 100, 0, 0.125)'
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
    v-if="box && showLabel && !labeledPlants.length"
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

  <g
    v-if="path.length"
    :transform="plantPreviewTransform"
    class="pointer-events-none"
  >
    <PlantCanopy
      v-for="thing in guild.plants.filter(hasPlantPlacement)"
      :key="thing.id"
      :thing="thing"
    />
    <PlantMapLabel
      v-for="thing in labeledPlants"
      :key="`label-${thing.id}`"
      :thing="thing"
      :font-size="camera.mapLabelFontSize"
    />
  </g>
  <slot name="features" />
</template>
