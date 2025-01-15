import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Guild, Plant } from './useGardenStore';
import { useStorage } from '@vueuse/core';
import { useIndexDB } from './useIndexDB';
import { assert } from './utils';

export const usePermaplannerStore = defineStore('permaplanner', () => {
  const fileHandle = ref<FileSystemFileHandle>();
  const fileName = useStorage<string | undefined>('permaplanner-file-name', undefined);

  const { db, openDb } = useIndexDB();

  const loadFromDB = async () => {
    if (!fileName.value) {
      return;
    }

    await openDb();

    const tx = await assert(db.value).transaction('plans', 'readonly');
    const store = await tx.objectStore('plans');
    const request = await store.get(fileName.value);

    request.onsuccess = () => {
      const data = request.result;
      if (!data) {
        return;
      }
      const json = JSON.parse(assert(data.json));
      backgroundImageDataUrl.value = json.backgroundImageDataUrl;
      plants.value = json.plants;
      guilds.value = json.guilds;
    };
  };

  const saveToDb = async () => {
    await openDb();

    const tx = assert(db.value).transaction('plans', 'readwrite');
    const store = tx.objectStore('plans');
    await store.put({
      id: fileName.value,
      json: JSON.stringify({
        backgroundImageDataUrl: backgroundImageDataUrl.value,
        plants: plants.value,
        guilds: guilds.value,
      }),
    });

    await tx.commit();
  };

  const load = async (handle: FileSystemFileHandle) => {
    const file = await handle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);

    backgroundImageDataUrl.value = data.backgroundImage;
    plants.value = data.plants;
    guilds.value = data.guilds;

    fileHandle.value = handle;
    fileName.value = file.name;

    await saveToDb();
  };

  const save = async (handle: FileSystemFileHandle) => {
    const text = JSON.stringify({
      backgroundImage: backgroundImageDataUrl.value,
      plants: plants.value,
      guilds: guilds.value,
    });

    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();

    fileHandle.value = handle;
    fileName.value = handle.name;

    await saveToDb();
  };

  const backgroundImageDataUrl = ref<string | undefined>();
  const plants = ref<Plant[]>();
  const guilds = ref<Guild[]>();

  return {
    load,
    loadFromDB,
    save,
    fileName,
    fileHandle,
    backgroundImageDataUrl,
    plants,
    guilds,
  };
});
