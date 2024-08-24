import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useCameraStore } from './useCameraStore';

export const useSceneStore = defineStore('sceneMousePosition', () => {
  const x = ref(0);
  const y = ref(0);

  const isDrawing = ref(false);
  const box = ref({ x: 0, y: 0, width: 0, height: 0 });

  const camera = useCameraStore();
  const cameraX = computed(() => (x.value + camera.x) / camera.scale);
  const cameraY = computed(() => (y.value + camera.y) / camera.scale);

  const cameraBox = computed(() => ({
    x: (box.value.x + camera.x) / camera.scale,
    y: (box.value.y + camera.y) / camera.scale,
    width: box.value.width / camera.scale,
    height: box.value.height / camera.scale,
  }));

  return { x, y, cameraX, cameraY, cameraBox, box, isDrawing };
});
