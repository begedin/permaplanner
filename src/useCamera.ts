import { ref, type Ref } from 'vue'

const MIN_ZOOM = 0.1
const MAX_ZOOM = 10

export const useCamera = (
  element: Ref<SVGElement | undefined>,
  dimensions: Ref<{
    viewportWidth: number
    viewportHeight: number
    contentWidth: number
    contentHeight: number
  }>,
) => {
  const camera = ref({ scale: 1, x: 0, y: 0 })
  const mouse = ref({ x: 0, y: 0 })

  const zoomBy = (factor: number) => {
    const { x, y, scale } = camera.value

    // this is the mouse cursor position in the unscaled image
    const originalPosition = {
      x: (x + mouse.value.x) * (1.0 / scale),
      y: (y + mouse.value.y) * (1.0 / scale),
    }

    const newScale =
      factor > 0
        ? Math.min(camera.value.scale + factor, MAX_ZOOM)
        : Math.max(camera.value.scale + factor, MIN_ZOOM)

    const newOffsetX = originalPosition.x * (newScale - 1) + (originalPosition.x - mouse.value.x)
    const newOffsetY = originalPosition.y * (newScale - 1) + (originalPosition.y - mouse.value.y)

    camera.value = {
      scale: newScale,
      x: newOffsetX,
      y: newOffsetY,
    }
  }

  const teardownController = new AbortController()

  const setupMousePositionTracking = () => {
    element.value?.addEventListener(
      'mousemove',
      (event) => ((mouse.value.x = event.offsetX), (mouse.value.y = event.offsetY)),
      { signal: teardownController.signal },
    )
  }

  const setupWheelZoom = () => {
    element.value?.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        zoomBy(e.deltaY < 0 ? 0.2 : -0.2)
      },
      { passive: false, signal: teardownController.signal },
    )
  }

  const setupKeyBindings = () => {
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'A') camera.value.x += 10
        if (e.key === 'ArrowRight' || e.key === 'D') camera.value.x -= 10
        if (e.key === 'ArrowUp' || e.key === 'W') camera.value.y += 10
        if (e.key === 'ArrowDown' || e.key === 'S') camera.value.y -= 10

        if (e.key === '+') zoomBy(0.1)
        if (e.key === '-') zoomBy(-0.1)
      },
      { signal: teardownController.signal },
    )
  }

  const setupMiddleMousePan = () => {
    document.addEventListener(
      'mousedown',
      (e) => {
        const wheelPanController = new AbortController()

        if (e.buttons !== 4) {
          return
        }

        e.preventDefault()

        document.addEventListener(
          'mousemove',
          (moveE) => {
            camera.value = {
              scale: camera.value.scale,
              x: camera.value.x - moveE.movementX,
              y: camera.value.y - moveE.movementY,
            }
          },
          { signal: wheelPanController.signal },
        )

        document.addEventListener(
          'mouseup',
          () => {
            wheelPanController.abort()
          },
          { signal: wheelPanController.signal },
        )
      },
      { signal: teardownController.signal },
    )
  }

  const fitToViewPort = () => {
    const { viewportWidth, viewportHeight, contentWidth, contentHeight } = dimensions.value
    const scale = Math.min(viewportWidth / contentWidth, viewportHeight / contentHeight)
    const x = -(viewportWidth - contentWidth * scale) / 2
    const y = -(viewportHeight - contentHeight * scale) / 2

    camera.value = { x, y, scale }
  }

  const setupCamera = () => {
    setupWheelZoom()
    setupMousePositionTracking()
    setupKeyBindings()
    setupMiddleMousePan()
  }

  const teardownCamera = () => teardownController.abort()

  return {
    camera,
    setupCamera,
    teardownCamera,
    fitToViewPort,
  }
}
