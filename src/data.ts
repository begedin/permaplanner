export const tools = [
  { kind: 'apple', name: 'Apple' },
  { kind: 'banana', name: 'Banana' },
  { kind: 'blueberry', name: 'Blueberry' },
  { kind: 'cherry', name: 'Cherry' },
  { kind: 'lemon', name: 'Lemon' },
  { kind: 'orange', name: 'Orange' },
  { kind: 'pear', name: 'Pear' },
  { kind: 'strawberry', name: 'Strawberry' }
] as const

type PlantKind = (typeof tools)[number]['kind']

export type Tool = {
  kind: PlantKind
  name: string
}

export type GardenThing = {
  name: string
  kind: PlantKind
  x: number
  y: number
  width: number
  height: number
}
