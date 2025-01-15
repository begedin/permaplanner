import { ref } from 'vue';

export const useIndexDB = () => {
  const db = ref<IDBDatabase>();

  const openDb = (): Promise<void> => {
    navigator.storage.persist();

    if (db.value) {
      return Promise.resolve();
    }

    const request = indexedDB.open('permaplanner', 3);

    return new Promise((resolve) => {
      request.onupgradeneeded = () => {
        const database = request.result;

        const stores = database.objectStoreNames;

        if (stores.contains('backgrounds')) {
          database.deleteObjectStore('backgrounds');
        }

        if (stores.contains('files')) {
          database.deleteObjectStore('files');
        }

        if (!stores.contains('plans')) {
          database.createObjectStore('plans', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        db.value = request.result;
        resolve();
      };
    });
  };

  return {
    db,
    openDb,
  };
};
