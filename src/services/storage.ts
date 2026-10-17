import { SavedReviewRecord } from '../types';

const DB_NAME = 'MatchaBookDB';
const DB_VERSION = 1;
const STORE_REVIEWS = 'reviews';

/**
 * Open IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_REVIEWS)) {
        const store = db.createObjectStore(STORE_REVIEWS, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('title', 'book.title', { unique: false });
        store.createIndex('author', 'book.author', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update review in IndexedDB
 */
export async function saveReviewToDB(record: SavedReviewRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REVIEWS, 'readwrite');
    const store = tx.objectStore(STORE_REVIEWS);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all saved reviews from IndexedDB
 */
export async function getAllSavedReviews(): Promise<SavedReviewRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REVIEWS, 'readonly');
    const store = tx.objectStore(STORE_REVIEWS);
    const index = store.index('createdAt');
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort newest first
      const results = (request.result as SavedReviewRecord[]) || [];
      results.sort((a, b) => b.createdAt - a.createdAt);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a specific review by ID
 */
export async function getReviewById(id: string): Promise<SavedReviewRecord | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REVIEWS, 'readonly');
    const store = tx.objectStore(STORE_REVIEWS);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a review from IndexedDB
 */
export async function deleteReviewFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REVIEWS, 'readwrite');
    const store = tx.objectStore(STORE_REVIEWS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all reviews
 */
export async function clearAllReviewsFromDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REVIEWS, 'readwrite');
    const store = tx.objectStore(STORE_REVIEWS);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
