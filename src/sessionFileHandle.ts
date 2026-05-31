const LEGACY_SESSION_ACTIVE = 'permaplanner.fileSessionActive';
const LEGACY_SESSION_NAME = 'permaplanner.sessionBoundFileName';
const LOCAL_STORAGE_BOUND_NAME_KEY = 'permaplanner.boundFileName';

const IDB_NAME = 'permaplanner';
const IDB_VERSION = 4;
const STORE = 'fileHandles';
const HANDLE_KEY = 'current';

const ensureStore = (db: IDBDatabase) => {
  if (!db.objectStoreNames.contains(STORE)) {
    db.createObjectStore(STORE);
  }
};

const deleteIdb = (): Promise<void> =>
  new Promise((resolve, reject) => {
    const del = indexedDB.deleteDatabase(IDB_NAME);
    del.onsuccess = () => resolve();
    del.onerror = () => reject(del.error ?? new Error('IndexedDB delete failed'));
    del.onblocked = () => {
      console.warn(
        '[permaplanner] Another tab may have this app open. Close it to finish clearing old IndexedDB data.',
      );
    };
  });

const isVersionError = (e: unknown): boolean =>
  e instanceof DOMException && e.name === 'VersionError';

const openDbRequest = (version: number): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, version);
    req.onerror = () => reject(req.error ?? new Error('IDB open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      ensureStore(req.result);
    };
  });
};

const resetFileLinkDatabase = async (reason: string) => {
  console.warn(`[permaplanner] ${reason}`);
  clearPersistedBoundFileName();
  await deleteIdb();
};

const openWithStore = async (): Promise<IDBDatabase> => {
  const db = await openDbRequest(IDB_VERSION);
  if (db.objectStoreNames.contains(STORE)) {
    return db;
  }
  db.close();
  await resetFileLinkDatabase(
    'The file link database is missing its object store. It will be recreated. Re-open your plan from disk if you need to.',
  );
  const again = await openDbRequest(IDB_VERSION);
  if (!again.objectStoreNames.contains(STORE)) {
    throw new Error('permaplanner: could not create IndexedDB object store');
  }
  return again;
};

const openDb = async (): Promise<IDBDatabase> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('indexedDB unavailable'));
  }
  try {
    return await openWithStore();
  } catch (e) {
    if (!isVersionError(e)) {
      throw e;
    }
    await resetFileLinkDatabase(
      "This site's IndexedDB is newer than this app expects (e.g. a different build). The local file link will be reset. Re-open your plan from disk if you need to.",
    );
    return openWithStore();
  }
};

const getHandleValueFromIdb = async (): Promise<FileSystemFileHandle | undefined> => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(HANDLE_KEY);
    r.onsuccess = () => {
      resolve(r.result as FileSystemFileHandle | undefined);
    };
    r.onerror = () => reject(r.error);
  });
};

const migrateLegacySessionMetadata = () => {
  try {
    const name = sessionStorage.getItem(LEGACY_SESSION_NAME);
    if (name && !localStorage.getItem(LOCAL_STORAGE_BOUND_NAME_KEY)) {
      localStorage.setItem(LOCAL_STORAGE_BOUND_NAME_KEY, name);
    }
    sessionStorage.removeItem(LEGACY_SESSION_ACTIVE);
    sessionStorage.removeItem(LEGACY_SESSION_NAME);
  } catch {
    // ignore
  }
};

export const getPersistedBoundFileName = (): string | undefined => {
  try {
    migrateLegacySessionMetadata();
    return localStorage.getItem(LOCAL_STORAGE_BOUND_NAME_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};

const setPersistedBoundFileName = (name: string) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_BOUND_NAME_KEY, name);
    sessionStorage.removeItem(LEGACY_SESSION_ACTIVE);
    sessionStorage.removeItem(LEGACY_SESSION_NAME);
  } catch {
    // private mode or blocked storage: binding still works in memory for this request
  }
};

const clearPersistedBoundFileName = () => {
  try {
    localStorage.removeItem(LOCAL_STORAGE_BOUND_NAME_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_ACTIVE);
    sessionStorage.removeItem(LEGACY_SESSION_NAME);
  } catch {
    // ignore
  }
};

const yieldToBrowser = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });

export const getFileHandle = async (): Promise<FileSystemFileHandle | undefined> => {
  if (typeof indexedDB === 'undefined') {
    return undefined;
  }
  try {
    return await getHandleValueFromIdb();
  } catch (e) {
    console.error('[permaplanner] Could not read file handle from IndexedDB:', e);
    return undefined;
  }
};

export const persistFileBinding = async (handle: FileSystemFileHandle) => {
  await yieldToBrowser();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const request = store.put(handle, HANDLE_KEY);
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB put failed'));
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
  });
  setPersistedBoundFileName(handle.name);
};

export const clearFileBinding = async () => {
  clearPersistedBoundFileName();
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      try {
        tx.objectStore(STORE).delete(HANDLE_KEY);
      } catch (e) {
        reject(e);
      }
    });
  } catch {
    // no DB or already empty
  }
};

/** When permission is `prompt`, may call `requestPermission` — use from a user gesture. */
export const ensureReadAccess = async (
  handle: FileSystemFileHandle,
): Promise<boolean> => {
  const q = await handle.queryPermission({ mode: 'read' });
  if (q === 'granted') {
    return true;
  }
  if (q === 'denied') {
    return false;
  }
  return (await handle.requestPermission({ mode: 'read' })) === 'granted';
};
