<script lang="ts" setup>
  import type { DeepReadonly } from 'vue';
  import { computed, ref, toRef, watch } from 'vue';

  import { placedCanopies } from './gardenTypes';
  import type { Guild } from './gardenTypes';
  import { useCameraStore } from './useCameraStore';
  import PlantMapLabel from './PlantMapLabel.vue';
  import PlantCanopy from './PlantCanopy.vue';
  import FutureCanopies from './FutureCanopies.vue';
  import GardenMeasure from './GardenMeasure.vue';
  import { pathBounds } from './guildPathBounds';
  import { cloneGuildPath, guildPathData, type GuildPath } from './guildPathClip';
  import type { AerialTool } from './useAerialTool';
  import { useGuildPathMove } from './useGuildPathMove';

  const props = withDefaults(
    defineProps<{
      previewPath?: GuildPath;
      guild: DeepReadonly<Guild>;
      hovered: boolean;
      selected: boolean;
      selectPlants?: boolean;
      selectedPlantId?: string;
      tool?: AerialTool;
      showLabel?: boolean;
      showPlantLabels?: boolean;
      labelLayer?: SVGGElement;
    }>(),
    { showLabel: true },
  );
  const camera = useCameraStore();
  const hoveredPlantId = ref<string>();
  const focusedPlantId = ref<string>();
  const canopies = computed(() => placedCanopies(props.guild.plants));
  const measuredPlant = computed(() => {
    if (!props.selectPlants) return;
    const id = hoveredPlantId.value ?? focusedPlantId.value ?? props.selectedPlantId;
    return canopies.value.find((plant) => plant.id === id);
  });
  const labeledPlants = computed(() =>
    props.showPlantLabels && camera.isFullyZoomed
      ? canopies.value.filter((thing) => thing.width * camera.scale * camera.zoom >= 24)
      : [],
  );
  const labelScale = computed(() => 1 / (camera.scale * camera.zoom || 1));

  const emit = defineEmits<{
    (e: 'move', path: GuildPath): void;
    (e: 'mouseenter' | 'mouseleave'): void;
    (e: 'click', evt: MouseEvent): void;
    (e: 'selectPlant', id: string): void;
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
  <g
    @mouseenter="emit('mouseenter')"
    @mouseleave="
      hoveredPlantId = undefined;
      emit('mouseleave');
    "
  >
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
      @click="emit('click', $event)"
    />
    <path
      :d="outline"
      stroke="black"
      fill="none"
      class="pointer-events-none"
    />
    <g
      v-if="path.length"
      :transform="plantPreviewTransform"
      class="pointer-events-none"
    >
      <PlantCanopy
        v-for="thing in canopies"
        :key="thing.id"
        :thing="thing"
        :selected="thing.id === selectedPlantId"
        :class="{ 'pointer-events-auto': selectPlants }"
        :tabindex="selectPlants ? 0 : undefined"
        :role="selectPlants ? 'button' : 'img'"
        :aria-pressed="selectPlants ? thing.id === selectedPlantId : undefined"
        :aria-describedby="
          measuredPlant?.id === thing.id ? `plant-size-${thing.id}` : undefined
        "
        @pointerenter="hoveredPlantId = thing.id"
        @pointerleave="hoveredPlantId = undefined"
        @focus="focusedPlantId = thing.id"
        @blur="focusedPlantId = undefined"
        @click.exact="selectPlants && emit('selectPlant', thing.id)"
        @keydown.enter.prevent="selectPlants && emit('selectPlant', thing.id)"
        @keydown.space.prevent="selectPlants && emit('selectPlant', thing.id)"
      />
      <FutureCanopies :plants="guild.plants" />
    </g>
  </g>
  <Teleport
    :to="labelLayer || 'body'"
    :disabled="!labelLayer"
  >
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
    <g
      v-if="path.length"
      :transform="plantPreviewTransform"
      class="pointer-events-none"
    >
      <PlantMapLabel
        v-for="thing in labeledPlants"
        :key="`label-${thing.id}`"
        :thing="thing"
        :font-size="camera.mapLabelFontSize"
      />
    </g>
    <GardenMeasure
      v-if="box && (hovered || selected || measuredPlant)"
      :box="box"
      :plant="measuredPlant"
      :font-size="camera.mapLabelFontSize"
    />
  </Teleport>
  <slot name="features" />
</template>
