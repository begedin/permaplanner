import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useCameraStore } from './useCameraStore';

export const useSceneStore = defineStore('scene', () => {
  const x = ref(0);
  const y = ref(0);

  const isDrawing = ref(false);
  const box = ref({ x: 0, y: 0, width: 0, height: 0 });

  const camera = useCameraStore();

  const worldBox = computed(() => {
    return {
      x: camera.cameraToWorld(box.value.x),
      y: camera.cameraToWorld(box.value.y),
      width: camera.cameraToWorld(box.value.width),
      height: camera.cameraToWorld(box.value.height),
    };
  });

  const worldX = computed(() => camera.cameraToWorld(x.value));
  const worldY = computed(() => camera.cameraToWorld(y.value));

  return {
    x,
    y,
    // represents the current X position in the world (image) space
    worldX,
    // represents the current Y position in the world (image) space
    worldY,
    // represents the box being drawn in the world (image) space
    worldBox,
    // represents the current box in the  space
    box,
    // represents the current drawing state
    isDrawing,
  };
});
