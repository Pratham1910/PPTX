/**
 * idb-storage.ts
 *
 * Minimal IndexedDB adapter that satisfies Zustand persist's AsyncStorage
 * interface. Replaces localStorage so large base64 assets (images, PPTX
 * thumbnails, whiteboard SVGs) don't hit the 5 MB localStorage quota.
 *
 * IndexedDB quota: typically 50 % of available disk space (GBs).
 */

const DB_NAME    = 'pptautomation';
const DB_VERSION = 1;
const STORE_NAME = 'state';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export const idbStorage = {
  async getItem(name: string): Promise<string | null> {
    try {
      const db = await openDb();
      return new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE_NAME, 'readonly');
        const get = tx.objectStore(STORE_NAME).get(name);
        get.onsuccess = () => resolve((get.result as string) ?? null);
        get.onerror   = () => reject(get.error);
      });
    } catch {
      return null;
    }
  },

  async setItem(name: string, value: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(STORE_NAME, 'readwrite');
      const put = tx.objectStore(STORE_NAME).put(value, name);
      put.onsuccess = () => resolve();
      put.onerror   = () => reject(put.error);
    });
  },

  async removeItem(name: string): Promise<void> {
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(name);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => resolve(); // non-fatal
      });
    } catch {
      // ignore
    }
  },
};
