import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const bgIds = ['bg_1', 'bg_2', 'bg_3', 'bg_4', 'bg_5', 'bg_6', 'bg_7', 'bg_8'] as const
export type BgId = (typeof bgIds)[number]

export const layerIds = [
  'layer_apple',
  'layer_banana',
  'layer_blueberry',
  'layer_cherry',
  'layer_lemon',
  'layer_orange',
  'layer_pear',
  'layer_strawberry',
] as const
export type LayerId = (typeof layerIds)[number]

export type Plant = {
  id: string
  name: string
  bgId: BgId
  layerId: LayerId
}

export type GardenThing = Plant & {
  x: number
  y: number
  width: number
  height: number
}

export const useStore = defineStore('store', () => {
  const plants = useStorage<Plant[]>('plants', [])
  const plant = ref<Plant>()

  const gardenPlants = useStorage<GardenThing[]>('gardenPlants', [])

  const deleteFeature = (index: number) => {
    gardenPlants.value.splice(index, 1)
  }

  const selectedIndex = ref<number>()
  const hoveredIndex = ref<number>()

  return { plants, plant, gardenPlants, deleteFeature, selectedIndex, hoveredIndex }
})
