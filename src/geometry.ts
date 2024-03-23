export type Point = { x: number; y: number }

export const getPath = (start: Point, end: Point) => `M ${start.x} ${start.y} L ${end.x} ${end.y}`

export const getCircle = (start: { x: number; y: number }, end: { x: number; y: number }) => {
  const centroid = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  }

  const radius = Math.min(Math.abs(end.x - start.x), Math.abs(end.y - start.y)) / 2

  return { cx: centroid.x, cy: centroid.y, r: radius }
}

export const getRectangle = (start: { x: number; y: number }, end: { x: number; y: number }) => ({
  x: Math.min(start.x, end.x),
  y: Math.min(start.y, end.y),
  width: Math.abs(end.x - start.x),
  height: Math.abs(end.y - start.y)
})

export const getLine = (start: { x: number; y: number }, end: { x: number; y: number }) => ({
  x1: start.x,
  y1: start.y,
  x2: end.x,
  y2: end.y,
  path: getPath(start, end)
})
