import { computed, ref, type Ref } from 'vue'

export const useDrawBox = (
  canDraw: Ref<boolean>,
  container: Ref<SVGElement | undefined>,
  onDrawEnd: () => void,
) => {
  const drawingBbox = ref<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })
  const isDrawing = computed(() => drawingBbox.value.width > 0 && drawingBbox.value.height > 0)

  const startDraw = (e: MouseEvent) => {
    if (!canDraw.value || e.button !== 0 || e.shiftKey || !container.value) {
      return
    }

    const svgOffsetX = container.value.getBoundingClientRect().left
    const svgOffsetY = container.value.getBoundingClientRect().top

    const x = e.clientX - svgOffsetX
    const y = e.clientY - svgOffsetY

    drawingBbox.value = { x, y, width: 0, height: 0 }

    const controller = new AbortController()

    document.addEventListener(
      'mousemove',
      (moveE: MouseEvent) => {
        const width = moveE.clientX - svgOffsetX - x
        const height = moveE.clientY - svgOffsetY - y

        drawingBbox.value = {
          x: Math.min(x, x + width),
          y: Math.min(y, y + height),
          width: Math.abs(width),
          height: Math.abs(height),
        }
      },

      { signal: controller.signal },
    )

    document.addEventListener('mouseup', () => {
      controller.abort()

      if (drawingBbox.value.width < 0.01 || drawingBbox.value.height < 0.01) {
        return
      }

      onDrawEnd()

      drawingBbox.value = { x: 0, y: 0, width: 0, height: 0 }
    })
  }

  return { startDraw, drawingBbox, isDrawing }
}
