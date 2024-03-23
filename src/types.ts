import type { HexColor } from './colors'

export type Tool = {
  kind: 'blueberry'
  name: string
}

export type GardenThing = { name: string | null } & {
  kind: 'blueberry'
  x: number
  y: number
  width: number
  height: number
}
