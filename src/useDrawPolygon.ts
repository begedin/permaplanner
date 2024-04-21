import { ref, type Ref } from 'vue'

const less = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  center: { x: number; y: number },
): boolean => {
  if (a.x - center.x >= 0 && b.x - center.x < 0) {
    return true
  }
  if (a.x - center.x < 0 && b.x - center.x >= 0) {
    return false
  }
  if (a.x - center.x == 0 && b.x - center.x == 0) {
    if (a.y - center.y >= 0 || b.y - center.y >= 0) {
      return a.y > b.y
    }
    return b.y > a.y
  }

  // compute the cross product of vectors (center -> a) x (center -> b)
  const det = (a.x - center.x) * (b.y - center.y) - (b.x - center.x) * (a.y - center.y)
  if (det < 0) {
    return true
  }
  if (det > 0) {
    return false
  }

  // points a and b are on the same line from the center
  // check which point is closer to the center
  const d1 = (a.x - center.x) * (a.x - center.x) + (a.y - center.y) * (a.y - center.y)
  const d2 = (b.x - center.x) * (b.x - center.x) + (b.y - center.y) * (b.y - center.y)
  return d1 > d2
}

const centroid = (points: { x: number; y: number }[]): { x: number; y: number } => {
  const x = points.reduce((acc, p) => acc + p.x, 0) / points.length
  const y = points.reduce((acc, p) => acc + p.y, 0) / points.length
  return { x, y }
}

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
    points.value.sort((a, b) => (less(a, b, centroid(points.value)) ? -1 : 1))

    const activePoint = points.value.at(-1)
    if (!activePoint) {
      throw new Error('Invalid state')
    }

    document.addEventListener(
      'mousemove',
      (e: MouseEvent) => {
        activePoint.x = e.clientX - svgOffsetX
        activePoint.y = e.clientY - svgOffsetY
        points.value.sort((a, b) => (less(a, b, centroid(points.value)) ? -1 : 1))
      },
      { signal: controller.signal },
    )

    container.value.addEventListener(
      'click',
      (clickEvent) => {
        const x = clickEvent.clientX - svgOffsetX
        const y = clickEvent.clientY - svgOffsetY
        points.value.push({ x, y })
        points.value.sort((a, b) => (less(a, b, centroid(points.value)) ? -1 : 1))
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
