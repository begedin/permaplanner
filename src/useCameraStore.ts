import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const MAX_ZOOM = 10;

export const useCameraStore = defineStore('camera', () => {
  const scale = ref(1);
  const zoom = ref(1.0);
  const x = ref(0);
  const y = ref(0);
  const width = ref(1000);
  const height = ref(1000);

  const isFullyZoomed = computed(() => zoom.value >= MAX_ZOOM);

  const mapLabelFontSize = computed(() => {
    const screenSize = Math.min(13, Math.max(9, 10 * Math.sqrt(zoom.value)));
    return screenSize / (scale.value * zoom.value || 1);
  });

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
    isFullyZoomed,
    cameraToWorld,
    mapLabelFontSize,
  };
});
