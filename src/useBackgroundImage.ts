import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export const useBackgroundImage = () => {
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
  }

  const setImageSrc = (src: string) => {
    imgSrc.value = src
    const img = document.createElement('img')
    img.src = imgSrc.value
    document.body.appendChild(img)
    if (img.complete) {
      setDimensions(img)
      img.remove()
    } else {
      img.onload = () => {
        setDimensions(img)
        img.remove()
      }
    }
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
        setImageSrc(base64)
        localStorage.setItem('imgSrc', base64)
      },
      { signal: pasteController.signal }
    )
  }

  const teardownBackgroundImagePaste = () => pasteController?.abort()

  return {
    setImageSrc,
    setupBackgroundImagePaste,
    teardownBackgroundImagePaste,
    imgWidth,
    imgHeight,
    imgSrc
  }
}
