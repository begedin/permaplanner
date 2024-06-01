import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCameraStore = defineStore('camera', () => {
  const scale = ref(1);
  const x = ref(0);
  const y = ref(0);

  return { scale, x, y };
});
