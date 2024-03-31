import { ref, type Ref } from 'vue'

export const useCamera = (element: Ref<SVGElement | undefined>) => {
  const camera = ref({ scale: 1, x: 0, y: 0 })
  const mouse = ref({ x: 0, y: 0 })

  const teardownController = new AbortController()

  const zoomBy = (factor: number) => {
    const { x, y, scale } = camera.value

    // this is the mouse cursor position in the unscaled image
    const originalPosition = {
      x: (x + mouse.value.x) * (1.0 / scale),
      y: (y + mouse.value.y) * (1.0 / scale)
    }

    const newScale =
      factor > 0
        ? Math.min(camera.value.scale + factor, 4)
        : Math.max(camera.value.scale + factor, 0.25)

    const newOffsetX = originalPosition.x * (newScale - 1) + (originalPosition.x - mouse.value.x)
    const newOffsetY = originalPosition.y * (newScale - 1) + (originalPosition.y - mouse.value.y)

    camera.value = {
      scale: newScale,
      x: newOffsetX,
      y: newOffsetY
    }
  }

  const setupCamera = () => {
    element.value?.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault()
        zoomBy(e.deltaY < 0 ? 0.1 : -0.1)
      },
      { passive: false, signal: teardownController.signal }
    )

    element.value?.addEventListener(
      'mousemove',
      (event) => ((mouse.value.x = event.offsetX), (mouse.value.y = event.offsetY)),
      { signal: teardownController.signal }
    )
  }

  const teardownCamera = () => teardownController.abort()

  return {
    camera,
    setupCamera,
    teardownCamera
  }
}
