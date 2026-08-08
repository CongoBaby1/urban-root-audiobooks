/**
 * Browser IndexedDB & In-Memory Audio File Storage Utility.
 * Stores full MP3/M4B audio binary blobs and Data URLs permanently.
 */

if (!window.__audio_cache) {
  window.__audio_cache = {};
}

const DB_NAME = 'UrbanRootAudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'audio_tracks';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Saves MP3/M4B audio blob or Data URL to IndexedDB & memory cache
 * @param {string} bookId 
 * @param {Blob|File|string} fileOrData 
 */
export async function saveAudioFile(bookId, fileOrData) {
  if (!bookId || !fileOrData) return false;

  // Immediate in-memory cache sync
  window.__audio_cache[bookId] = fileOrData;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(fileOrData, bookId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('IndexedDB save notice:', err);
    return false;
  }
}

/**
 * Retrieves stored audio from memory cache or IndexedDB
 * @param {string} bookId 
 * @returns {Promise<Blob|File|string|null>}
 */
export async function getAudioFile(bookId) {
  if (!bookId) return null;

  if (window.__audio_cache && window.__audio_cache[bookId]) {
    return window.__audio_cache[bookId];
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(bookId);
      req.onsuccess = (e) => {
        const res = e.target.result || null;
        if (res) {
          window.__audio_cache[bookId] = res;
        }
        resolve(res);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB get notice:', err);
    return null;
  }
}
