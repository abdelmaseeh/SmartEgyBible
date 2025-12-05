import { ChapterTranslation } from '../types';

const STORAGE_KEY_PREFIX = 'bible_masri_cache_';
const AUDIO_DB_NAME = 'bible_masri_audio_db';
const AUDIO_STORE_NAME = 'audio_chunks';

export const getCachedTranslation = (bookId: string, chapter: number): ChapterTranslation | null => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${bookId}_${chapter}`;
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as ChapterTranslation;
  } catch (error) {
    console.error("Failed to retrieve from cache", error);
    return null;
  }
};

export const saveTranslationToCache = (translation: ChapterTranslation): void => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${translation.bookId}_${translation.chapterNumber}`;
    localStorage.setItem(key, JSON.stringify(translation));
  } catch (error) {
    console.error("Failed to save to cache", error);
    // Likely quota exceeded or private mode restrictions
  }
};

// --- IndexedDB for Audio (Binary/Large Data) ---

const openAudioDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject("IndexedDB not supported");
            return;
        }
        const request = window.indexedDB.open(AUDIO_DB_NAME, 1);
        
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(AUDIO_STORE_NAME)) {
                db.createObjectStore(AUDIO_STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getCachedAudio = async (bookId: string, chapter: number): Promise<string | null> => {
    try {
        const db = await openAudioDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([AUDIO_STORE_NAME], 'readonly');
            const store = transaction.objectStore(AUDIO_STORE_NAME);
            const key = `${bookId}_${chapter}`;
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to get audio from IDB", error);
        return null;
    }
};

export const saveAudioToCache = async (bookId: string, chapter: number, base64Audio: string): Promise<void> => {
    try {
        const db = await openAudioDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(AUDIO_STORE_NAME);
            const key = `${bookId}_${chapter}`;
            const request = store.put(base64Audio, key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to save audio to IDB", error);
    }
};

export const clearCache = async (): Promise<void> => {
    // 1. Clear LocalStorage (Text)
    Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
        }
    });

    // 2. Clear IndexedDB (Audio)
    try {
        const db = await openAudioDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([AUDIO_STORE_NAME], 'readwrite');
            const store = transaction.objectStore(AUDIO_STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error clearing audio DB", error);
    }
};