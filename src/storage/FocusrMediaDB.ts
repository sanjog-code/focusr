/**
 * FocusrMediaDB
 * High-performance IndexedDB storage for custom user live wallpaper videos.
 * Allows storing large video files (50MB - 200MB+) locally without localStorage quota limits.
 */

export interface StoredVideoRecord {
    id: string;
    name: string;
    blob: Blob;
    mimeType: string;
    thumbnail: string;
    duration?: number;
    size?: number;
    accent?: string;
    accentGlow?: string;
    liquidHue?: number;
    tint?: string;
    orb1?: string;
    orb2?: string;
    orb3?: string;
    palette?: string[];
    createdAt: number;
}

const DB_NAME = 'focusr_media_store';
const DB_VERSION = 1;
const STORE_NAME = 'videos';

export const FocusrMediaDB = {
    dbPromise: null as Promise<IDBDatabase> | null,

    getDB(): Promise<IDBDatabase> {
        if (this.dbPromise) return this.dbPromise;

        this.dbPromise = new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') {
                return reject(new Error('IndexedDB not supported in this browser environment.'));
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
                const db = (e.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                this.dbPromise = null;
                reject(request.error || new Error('Failed to open FocusrMediaDB'));
            };
        });

        return this.dbPromise;
    },

    async saveVideo(record: StoredVideoRecord): Promise<void> {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async getAllVideos(): Promise<StoredVideoRecord[]> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn('Could not retrieve stored videos from FocusrMediaDB:', err);
            return [];
        }
    },

    async getVideo(id: string): Promise<StoredVideoRecord | null> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return null;
        }
    },

    async deleteVideo(id: string): Promise<void> {
        try {
            const db = await this.getDB();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(id);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn('Could not delete video from FocusrMediaDB:', err);
        }
    }
};

if (typeof window !== 'undefined') {
    (window as any).FocusrMediaDB = FocusrMediaDB;
}
