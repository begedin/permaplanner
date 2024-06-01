import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSceneMousePositionStore = defineStore('sceneMousePosition', () => {
  const x = ref(0);
  const y = ref(0);

  return { x, y };
});
