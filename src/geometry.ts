import type { GardenThing } from './data'

export const scaleUp = (s: GardenThing, imgWidth: number, imgHeight: number): GardenThing => {
  return {
    ...s,
    x: s.x * imgWidth,
    y: s.y * imgHeight,
    width: s.width * imgWidth,
    height: s.height * imgHeight
  }
}

export const scaleDown = (s: GardenThing, imgWidth: number, imgHeight: number): GardenThing => {
  return {
    ...s,
    x: s.x / imgWidth,
    y: s.y / imgHeight,
    width: s.width / imgWidth,
    height: s.height / imgHeight
  }
}
