import { onMounted, ref, watch } from 'vue';

export const useBackgroundImage = () => {
  let db: IDBDatabase;
  onMounted(async () => {
    navigator.storage.persist();
    const request = indexedDB.open('permaplanner', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('backgrounds', { keyPath: 'id' });
    };

    request.onsuccess = () => {
      db = request.result;
      const tx = db.transaction('backgrounds');
      const store = tx.objectStore('backgrounds');
      const bgRequest = store.get('background');
      bgRequest.onsuccess = () => {
        const bg = bgRequest.result;
        if (bg) {
          imgSrc.value = URL.createObjectURL(bg.file);
        }
      };
    };
  });

  const ready = ref(false);

  const imgSrc = ref<string>();

  const imgWidth = ref(0);
  const imgHeight = ref(0);

  const setDimensions = (img: HTMLImageElement): void => {
    imgWidth.value = img.width;
    imgHeight.value = img.height;
    ready.value = true;
  };

  const setImageSrc = async (src: string) => {
    ready.value = false;
    const img = document.createElement('img');
    img.src = src;

    document.body.appendChild(img);
    return new Promise((resolve) => {
      if (img.complete) {
        setDimensions(img);
        img.remove();
        resolve(undefined);
      } else {
        img.onload = () => {
          setDimensions(img);
          img.remove();
          resolve(undefined);
        };
      }
    });
  };

  watch(imgSrc, () => imgSrc.value && setImageSrc(imgSrc.value), { immediate: true });

  let pasteController: AbortController | null = null;

  const setupBackgroundImagePaste = () => {
    pasteController = new AbortController();

    document.addEventListener(
      'paste',
      async (e) => {
        if (!e.clipboardData || !e.clipboardData.items) return;
        const file = e.clipboardData.items[0].getAsFile();
        if (!file) {
          return;
        }

        const tx = db.transaction('backgrounds', 'readwrite');
        const store = tx.objectStore('backgrounds');
        store.put({ id: 'background', file });

        imgSrc.value = URL.createObjectURL(file);
      },
      { signal: pasteController.signal },
    );
  };

  const teardownBackgroundImagePaste = () => pasteController?.abort();

  return {
    setImageSrc,
    setupBackgroundImagePaste,
    teardownBackgroundImagePaste,
    imgWidth,
    imgHeight,
    imgSrc,
    ready,
  };
};
