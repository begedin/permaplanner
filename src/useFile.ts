import { onMounted, ref } from 'vue';
import { useIndexDB } from './useIndexDB';
import { assert } from './utils';

export const useFile = () => {
  const fileHandle = ref<FileSystemFileHandle>();
  const { db, openDb } = useIndexDB();

  onMounted(async () => {
    navigator.storage.persist();
    const request = indexedDB.open('permaplanner', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore('files');
    };

    request.onsuccess = () => {
      db.value = request.result;
    };
  });

  const saveHandle = async (handle: FileSystemFileHandle) => {
    const tx = assert(db.value).transaction('files', 'readwrite');
    const store = tx.objectStore('files');
    store.put({ id: 'file', handle });
    fileHandle.value = handle;
  };

  const loadHandle = async () => {
    await openDb();
    const tx = assert(db.value).transaction('files');
    const store = tx.objectStore('files');
    const fileRequest = store.get('file');
    fileRequest.onsuccess = () => {
      if (fileRequest.result) {
        fileHandle.value = fileRequest.result.handle;
      }
    };
  };

  return {
    fileHandle,
    saveHandle,
    loadHandle,
  };
};
