import { computed, ref, onMounted, type Ref, watch } from 'vue'

const DEFAULT_START = { x: 20, y: 20 }
const DEFAULT_END = { x: 150, y: 20 }

export const useMapScale = (camera: Ref<{ x: number; y: number; scale: number }>) => {
  const mapScaleStart = ref<{ x: number; y: number }>(DEFAULT_START)
  const mapScaleEnd = ref<{ x: number; y: number }>(DEFAULT_END)
  const mapScaleReferenceLength = ref<number>(10)

  const onboardingSteps = [
    'initial',
    'movingFirst',
    'movedFirst',
    'movingSecond',
    'movedSecond',
    'settingLength',
    'done',
  ] as const

  const onboardingState = ref<
    | 'initial'
    | 'movingFirst'
    | 'movedFirst'
    | 'movingSecond'
    | 'movedSecond'
    | 'settingLength'
    | 'done'
  >('initial')

  const advanceOnboarding = () => {
    const currentIndex = onboardingSteps.indexOf(onboardingState.value)
    onboardingState.value = onboardingSteps[currentIndex + 1] || onboardingSteps.at(-1)
  }

  const mapScaleReferenceLine = computed(() => {
    return {
      x1: mapScaleStart.value.x,
      y1: mapScaleStart.value.y,
      x2: mapScaleEnd.value.x,
      y2: mapScaleEnd.value.y,
    }
  })

  const mapScaleReferenceCentroid = computed(() => {
    const { x1, y1, x2, y2 } = mapScaleReferenceLine.value
    const x = Math.abs((x1 + x2) / 2)
    const y = Math.abs((y1 + y2) / 2)

    return { x, y }
  })

  const mapScaleReferenceLineRealLength = ref<number>(1)

  const mapScaleUnitLengthPx = computed(() => {
    const x1 = mapScaleStart.value.x
    const y1 = mapScaleStart.value.y
    const x2 = mapScaleEnd.value.x
    const y2 = mapScaleEnd.value.y

    const indicatorLengthPx = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    return indicatorLengthPx / mapScaleReferenceLineRealLength.value
  })

  const setupMapScale = () => {
    onMounted(() => {
      const data = localStorage.getItem('mapScale')

      if (!data) {
        return
      }
      const { start, end, realLength, state } = JSON.parse(data)
      mapScaleStart.value = start || DEFAULT_START
      mapScaleEnd.value = end || DEFAULT_END
      mapScaleReferenceLineRealLength.value = parseInt(realLength)
      onboardingState.value = state || 'initial'
    })

    watch(
      [mapScaleStart, mapScaleEnd, mapScaleReferenceLineRealLength, onboardingState],
      ([start, end, realLength, state]) => {
        localStorage.setItem('mapScale', JSON.stringify({ start, end, realLength, state }))
      },
    )
  }

  const startMoveScaleStart = (e: MouseEvent) => {
    mapScaleStart.value = {
      x: (e.offsetX + camera.value.x) / camera.value.scale,
      y: (e.offsetY + camera.value.y) / camera.value.scale,
    }

    const { x, y } = mapScaleStart.value

    const startX = e.clientX
    const startY = e.clientY

    const controller = new AbortController()

    document.addEventListener(
      'mousemove',
      (moveE: MouseEvent) => {
        const dx = (moveE.clientX - startX) / camera.value.scale
        const dy = (moveE.clientY - startY) / camera.value.scale
        dx > 0 &&
          dy > 0 &&
          onboardingState.value !== 'movingFirst' &&
          onboardingState.value !== 'movingSecond' &&
          advanceOnboarding()

        mapScaleStart.value = { x: x + dx, y: y + dy }
      },
      { signal: controller.signal },
    )

    document.addEventListener(
      'mouseup',
      () => {
        ;(onboardingState.value === 'movingFirst' || onboardingState.value === 'movingSecond') &&
          advanceOnboarding()
        controller.abort()
      },
      { once: true },
    )
  }

  const startMoveScaleEnd = (e: MouseEvent) => {
    mapScaleEnd.value = {
      x: (e.offsetX + camera.value.x) / camera.value.scale,
      y: (e.offsetY + camera.value.y) / camera.value.scale,
    }

    const { x, y } = mapScaleEnd.value

    const startX = e.clientX
    const startY = e.clientY

    const controller = new AbortController()

    document.addEventListener(
      'mousemove',
      (moveE: MouseEvent) => {
        const dx = (moveE.clientX - startX) / camera.value.scale
        const dy = (moveE.clientY - startY) / camera.value.scale

        dx > 0 &&
          dy > 0 &&
          onboardingState.value !== 'movingFirst' &&
          onboardingState.value !== 'movingSecond' &&
          advanceOnboarding()

        mapScaleEnd.value = { x: x + dx, y: y + dy }
      },
      { signal: controller.signal },
    )

    document.addEventListener(
      'mouseup',
      () => {
        ;(onboardingState.value === 'movingFirst' || onboardingState.value === 'movingSecond') &&
          advanceOnboarding()
        controller.abort()
      },
      { once: true },
    )
  }

  let timeout = 0
  watch(mapScaleReferenceLineRealLength, (l) => {
    if (l === 1) return
    onboardingState.value = 'settingLength'
    window.clearTimeout(timeout)
    timeout = window.setTimeout(() => {
      advanceOnboarding()
    }, 1000)
  })

  return {
    mapScaleEnd,
    mapScaleReferenceCentroid,
    mapScaleReferenceLength,
    mapScaleReferenceLine,
    mapScaleReferenceLineRealLength,
    mapScaleStart,
    mapScaleUnitLengthPx,
    setupMapScale,
    startMoveScaleEnd,
    startMoveScaleStart,
    onboardingState,
  }
}
