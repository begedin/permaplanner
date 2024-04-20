import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const baseLayers = ['bg_1', 'bg_2', 'bg_3', 'bg_4', 'bg_5', 'bg_6', 'bg_7', 'bg_8'] as const
export type BaseLayer = (typeof baseLayers)[number]

export type Plant = {
  id: string
  name: string
  background: BaseLayer
  features: {
    feature: Feature
    x: number
    y: number
    width: number
    height: number
  }[]
}

export type GardenThing = {
  id: string
  name?: string
  plantId: string
  x: number
  y: number
  width: number
  height: number
}

export const features = [
  'apple',
  'banana',
  'blueberry',
  'cherry',
  'lemon',
  'orange',
  'pear',
  'strawberry',
] as const

export type Feature = (typeof features)[number]

export const useStore = defineStore('store', () => {
  const plants = useStorage<Plant[]>('plants', [])
  const plant = ref<Plant>()

  const gardenThings = useStorage<GardenThing[]>('gardenThings', [])

  const deleteFeature = (id: string) => {
    gardenThings.value = gardenThings.value.filter((thing) => thing.id !== id)
  }

  const selectedId = ref<string>()
  const hoveredId = ref<string>()

  const gardenThingsWithPlants = computed(() => {
    const data = <{ thing: GardenThing; plant: Plant }[]>[]
    gardenThings.value.forEach((thing) => {
      const plant = plants.value.find((p) => p.id === thing.plantId)
      if (plant) {
        data.push({ thing, plant })
      }
    })
    return data
  })

  return {
    plants,
    plant,
    gardenThings,
    gardenThingsWithPlants,
    deleteFeature,
    selectedId,
    hoveredId,
  }
})
