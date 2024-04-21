import { ref, type Ref } from 'vue'

export const useDrawPolygon = (container: Ref<SVGElement | undefined>, onConfirm: () => void) => {
  const points = ref<{ x: number; y: number }[]>([])

  const startDraw = (e: MouseEvent) => {
    if (container.value === undefined) {
      return
    }
    const controller = new AbortController()

    const svgOffsetX = container.value.getBoundingClientRect().left
    const svgOffsetY = container.value.getBoundingClientRect().top

    const x = e.clientX - svgOffsetX
    const y = e.clientY - svgOffsetY

    points.value.push({ x, y })

    document.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        const activePoint = points.value.at(-1)
        if (!activePoint) return
        activePoint.x = e.clientX - svgOffsetX
        activePoint.y = e.clientY - svgOffsetY
      },
      { signal: controller.signal },
    )

    container.value.addEventListener(
      'click',
      (clickEvent) => {
        points.value.splice(points.value.length - 1, 0, {
          x: clickEvent.clientX - svgOffsetX,
          y: clickEvent.clientY - svgOffsetY,
        })
      },
      { signal: controller.signal },
    )

    document.addEventListener('keypress', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        points.value.splice(points.value.length - 1, 1)
        onConfirm()
        points.value = []
        controller.abort()
      }

      if (e.key === 'Escape') {
        points.value = []
        controller.abort()
      }
    })
  }

  return {
    startDraw,
    points,
  }
}
