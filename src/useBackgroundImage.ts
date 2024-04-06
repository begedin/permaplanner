import { ref } from 'vue'

export const useBackgroundImage = () => {
  const ready = ref(false)
  const getFileBase64 = async (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
      reader.readAsDataURL(file)
    })

  const imgSrc = ref<string | null>(null)

  const imgWidth = ref(0)
  const imgHeight = ref(0)

  const setDimensions = (img: HTMLImageElement): void => {
    imgWidth.value = img.width
    imgHeight.value = img.height
    ready.value = true
  }

  const setImageSrc = async (src: string) => {
    ready.value = false
    imgSrc.value = src
    const img = document.createElement('img')
    img.src = imgSrc.value
    document.body.appendChild(img)
    return new Promise((resolve) => {
      if (img.complete) {
        setDimensions(img)
        img.remove()
        resolve(undefined)
      } else {
        img.onload = () => {
          setDimensions(img)
          img.remove()
          resolve(undefined)
        }
      }
    })
  }

  let pasteController: AbortController | null = null

  const setupBackgroundImagePaste = () => {
    pasteController = new AbortController()

    document.addEventListener(
      'paste',
      async (e) => {
        if (!e.clipboardData || !e.clipboardData.items) return
        const file = e.clipboardData.items[0].getAsFile()
        if (!file) {
          return
        }

        const base64 = await getFileBase64(file)
        await setImageSrc(base64)
        localStorage.setItem('imgSrc', base64)
      },
      { signal: pasteController.signal },
    )
  }

  const teardownBackgroundImagePaste = () => pasteController?.abort()

  return {
    setImageSrc,
    setupBackgroundImagePaste,
    teardownBackgroundImagePaste,
    imgWidth,
    imgHeight,
    imgSrc,
    ready,
  }
}
