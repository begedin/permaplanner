import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSceneStore = defineStore('scene', () => {
  const x = ref(0);
  const y = ref(0);
  const worldX = ref(0);
  const worldY = ref(0);

  const isDrawing = ref(false);
  const box = ref({ x: 0, y: 0, width: 0, height: 0 });
  const worldBox = ref({ x: 0, y: 0, width: 0, height: 0 });

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
