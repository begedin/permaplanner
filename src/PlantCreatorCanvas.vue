<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import MovableResizable from './MovableResizable.vue';
import { useDrawBox } from './useDrawBox';
import type { Feature, Plant } from './useStore';

const props = defineProps<{
  plant: Plant;
  currentFeature: Feature;
  scale: number;
}>();

const emit = defineEmits<{ (e: 'update:plant', plant: Plant): void }>();

const selectedIndex = ref<number | null>(null);

const createNewFeature = () => {
  if (newPart.value.width === 0 || newPart.value.height === 0) {
    return;
  }
  const newFeatures = [...props.plant.features, newPart.value];
  console.log('createNewFeature', newFeatures.length);
  emit('update:plant', { ...props.plant, features: newFeatures });
};

const container = ref<SVGElement>();

const { box, isDrawing } = useDrawBox(container);
watch(isDrawing, (isDrawing) => {
  if (!isDrawing) {
    createNewFeature();
  }
});

const newPart = computed(() => ({
  x: box.value.x * props.scale,
  y: box.value.y * props.scale,
  width: box.value.width * props.scale,
  height: box.value.height * props.scale,
  feature: props.currentFeature,
}));

const replaceFeature = (
  index: number,
  payload: { x: number; y: number; width: number; height: number },
) => {
  const feature = props.plant.features[index];
  const newFeature = {
    ...feature,
    ...payload,
  };

  const newFeatures = [...props.plant.features];
  newFeatures.splice(index, 1, newFeature);

  console.log('replaceFeature', props.plant.features.length, newFeatures.length);

  emit('update:plant', {
    ...props.plant,
    features: newFeatures,
  });
};

const removeFeature = (index: number) => {
  const newFeatures = [...props.plant.features];
  newFeatures.splice(index, 1);

  emit('update:plant', {
    ...props.plant,
    features: newFeatures,
  });
};
</script>
<template>
  <svg
    ref="container"
    class="w-full h-full"
    height="100%"
    width="100%"
    viewBox="0 0 100 100"
  >
    <use
      :xlink:href="'#' + plant.background"
      x="0"
      y="0"
      width="100%"
      height="100%"
    />
    <MovableResizable
      v-for="(part, index) in plant.features"
      :key="part.feature"
      :active="selectedIndex === index"
      :x="part.x"
      :y="part.y"
      :width="part.width"
      :height="part.height"
      :scale="1 / scale"
      @update="($event) => replaceFeature(index, $event)"
    >
      <use
        :xlink:href="'#' + part.feature"
        :x="part.x"
        :y="part.y"
        :width="part.width"
        :height="part.height"
        @click.exact="selectedIndex = index"
        @click.shift="removeFeature(index)"
      />
    </MovableResizable>
    <MovableResizable
      v-if="isDrawing"
      :active="true"
      :x="newPart.x"
      :y="newPart.y"
      :width="newPart.width"
      :height="newPart.height"
      :scale="1 / scale"
    >
      <use
        :xlink:href="'#' + currentFeature"
        :x="newPart.x"
        :y="newPart.y"
        :width="newPart.width"
        :height="newPart.height"
      />
    </MovableResizable>
  </svg>
</template>
