import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSceneStore = defineStore('sceneMousePosition', () => {
  const x = ref(0);
  const y = ref(0);

  const isDrawing = ref(false);
  const box = ref({ x: 0, y: 0, width: 0, height: 0 });

  return { x, y, box, isDrawing };
});
