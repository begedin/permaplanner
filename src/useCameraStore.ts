import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useCameraStore = defineStore('camera', () => {
  const scale = ref(1);
  const zoom = ref(1.0);
  const x = ref(0);
  const y = ref(0);
  const width = ref(0);
  const height = ref(0);

  const cameraToWorld = (value: number) => value / scale.value / zoom.value;

  return {
    /**
     * The ratio of image natural dimensions to the viewport dimensions, after it's been fitted to the svg container.
     * This is the smaller of the X and Y ratios.
     *
     * Needed to convert camera coordinates to image natural coordinates
     */
    scale,
    /**
     * Current zoom level of the camera
     */
    zoom,
    /**
     * X offset of the camera box
     */
    x,
    /**
     * Y offset of the camera box
     */
    y,
    /**
     * Width of the camera box
     */
    width,
    /**
     * Height of the camera box
     */
    height,
    cameraToWorld,
  };
});
