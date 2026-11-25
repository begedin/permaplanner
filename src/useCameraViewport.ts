import { watch, type Ref } from 'vue';
import type { PathBounds } from './guildPathBounds';
import type { PathPoint } from './guildPathClip';
import { MAX_ZOOM, useCameraStore } from './useCameraStore';

export type CameraFocus = () => PathBounds | undefined;
export type CameraDimensions = {
  containerWidth: number;
  containerHeight: number;
  worldWidth: number;
  worldHeight: number;
};

export const fitGuildView = (
  box: PathBounds,
  viewportWidth: number,
  viewportHeight: number,
) => {
  const padding = Math.max(box.width, box.height) * 0.08 || 10;
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    viewportWidth = 1;
    viewportHeight = 1;
  }
  const scale = Math.min(
    viewportWidth / (box.width + 2 * padding),
    viewportHeight / (box.height + 2 * padding),
  );
  const width = viewportWidth / scale;
  const height = viewportHeight / scale;
  return {
    scale,
    bounds: {
      x: box.x + (box.width - width) / 2,
      y: box.y + (box.height - height) / 2,
      width,
      height,
    },
  };
};

export const useCameraViewport = (
  dimensions: Readonly<Ref<CameraDimensions>>,
  focus: Readonly<Ref<CameraFocus | undefined>>,
  onReframe: () => void,
) => {
  const camera = useCameraStore();
  // Keep the guild centered on resize until the user moves the camera.
  let activeFocus: CameraFocus | undefined;
  const setOrigin = (x: number, y: number) => {
    const { worldWidth, worldHeight } = dimensions.value;
    const maxX = worldWidth - camera.width;
    const maxY = worldHeight - camera.height;
    camera.x = maxX < 0 ? maxX / 2 : Math.min(maxX, Math.max(0, x));
    camera.y = maxY < 0 ? maxY / 2 : Math.min(maxY, Math.max(0, y));
  };
  const panTo = (x: number, y: number) => {
    const { x: previousX, y: previousY } = camera;
    setOrigin(x, y);
    if (camera.x !== previousX || camera.y !== previousY) activeFocus = undefined;
  };

  const sizeView = (zoom: number) => {
    const { containerWidth, containerHeight } = dimensions.value;
    if (containerWidth <= 0 || containerHeight <= 0) return;
    camera.zoom = Math.max(1, Math.min(zoom, MAX_ZOOM));
    camera.width = camera.cameraToWorld(containerWidth);
    camera.height = camera.cameraToWorld(containerHeight);
  };

  const zoomAt = (value: number, anchor: PathPoint, screenOffset?: PathPoint) => {
    const ratioX = (anchor.x - camera.x) / camera.width;
    const ratioY = (anchor.y - camera.y) / camera.height;

    const previousZoom = camera.zoom;
    sizeView(value);
    if (camera.zoom !== previousZoom) activeFocus = undefined;
    const dx = screenOffset
      ? camera.cameraToWorld(screenOffset.x)
      : ratioX * camera.width;
    const dy = screenOffset
      ? camera.cameraToWorld(screenOffset.y)
      : ratioY * camera.height;
    panTo(anchor.x - dx, anchor.y - dy);
  };

  watch(
    [dimensions, focus],
    (
      [{ containerWidth, containerHeight, worldWidth, worldHeight }, request],
      [previous, previousRequest],
    ) => {
      if (Math.min(containerWidth, containerHeight, worldWidth, worldHeight) <= 0) return;
      const newMap =
        !previous?.containerWidth ||
        !previous.containerHeight ||
        worldWidth !== previous.worldWidth ||
        worldHeight !== previous.worldHeight;
      if (newMap || request !== previousRequest) activeFocus = request;
      const center = camera.center;
      camera.scale = Math.min(containerWidth / worldWidth, containerHeight / worldHeight);
      if (newMap || (request && request !== previousRequest)) onReframe();
      const box = activeFocus?.();
      if (box && box.width > 0 && box.height > 0) {
        const frame = fitGuildView(box, containerWidth, containerHeight);
        sizeView(frame.scale / camera.scale);
        setOrigin(
          box.x + (box.width - camera.width) / 2,
          box.y + (box.height - camera.height) / 2,
        );
      } else {
        sizeView(newMap ? 1 : camera.zoom);
        setOrigin(center.x - camera.width / 2, center.y - camera.height / 2);
      }
    },
    { immediate: true },
  );

  return { camera, panTo, zoomAt };
};
