import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export const useSVGCanvas = (
  svgRef: Ref<SVGElement | undefined>,
  camera: Ref<{ x: number; y: number; scale: number }>,
) => {
  let controller = new AbortController()

  const mouseX = ref(0)
  const mouseY = ref(0)

  onMounted(() => {
    controller = new AbortController()
    svgRef.value?.addEventListener('mousemove', (e) => {
      mouseX.value = e.offsetX + camera.value.x
      mouseY.value = e.offsetY + camera.value.y
    })
  })

  onBeforeUnmount(() => {
    controller.abort()
  })

  return { mouseX, mouseY }
}
