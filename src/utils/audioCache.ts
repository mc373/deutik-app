// utils/audioCache.ts
import { AudioCacheItem } from "../types/audio";

export class AudioCache {
  private dbName: string = "GermanVerbsAudioCache";
  private storeName: string = "audioFiles";
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, {
            keyPath: "hash",
          });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("lastAccessed", "lastAccessed", { unique: false });
        }
      };
    });
  }

  async getAudio(hash: string): Promise<string | null> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readonly");
      const store = transaction.objectStore(this.storeName);
      const request = store.get(hash);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          // 更新最后访问时间
          this.updateLastAccessed(hash);
          const audioURL = URL.createObjectURL(request.result.audioBlob);
          resolve(audioURL);
        } else {
          resolve(null);
        }
      };
    });
  }

  async saveAudio(hash: string, audioBlob: Blob): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const item: AudioCacheItem = {
        hash,
        audioBlob,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };
      const request = store.put(item);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async updateLastAccessed(hash: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(hash);

      getRequest.onerror = () => reject(getRequest.error);
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          const item: AudioCacheItem = {
            ...getRequest.result,
            lastAccessed: Date.now(),
          };
          const putRequest = store.put(item);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => resolve();
        }
      };
    });
  }

  async preloadAudios(hashes: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    for (const hash of hashes) {
      const cachedAudio = await this.getAudio(hash);
      if (cachedAudio) {
        results[hash] = cachedAudio;
      }
    }
    return results;
  }

  async cleanupOldAudios(
    maxAge: number = 30 * 24 * 60 * 60 * 1000
  ): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], "readwrite");
      const store = transaction.objectStore(this.storeName);
      const index = store.index("lastAccessed");
      const cutoff = Date.now() - maxAge;
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }
}

export const audioCache = new AudioCache();
