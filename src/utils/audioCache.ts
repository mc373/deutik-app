// utils/audioCache.ts
import { AudioCacheItem } from "../types/audio";

export class AudioCache {
  private readonly dbName = "GermanVerbsAudioCache";
  private readonly storeName = "audioFiles";
  private db: IDBDatabase | null = null; // 允许 null，并赋初值

  /* ---------- 私有：确保数据库已打开 ---------- */
  private async ensureDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise<IDBDatabase>((resolve, reject) => {
      const openReq = indexedDB.open(this.dbName, 1);

      openReq.onerror = () => reject(openReq.error);
      openReq.onsuccess = () => {
        this.db = openReq.result;
        resolve(this.db);
      };
      openReq.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (e.target as IDBOpenDBRequest).result;
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

  /* ---------- 公开 API ---------- */
  async getAudio(hash: string): Promise<string | null> {
    const db = await this.ensureDB();
    return new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const req = store.get(hash);

      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        if (!req.result) return resolve(null);
        // 异步更新最后访问时间，无返回值
        this.updateLastAccessed(hash);
        resolve(URL.createObjectURL(req.result.audioBlob));
      };
    });
  }

  async saveAudio(hash: string, audioBlob: Blob): Promise<void> {
    const db = await this.ensureDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const item: AudioCacheItem = {
        hash,
        audioBlob,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
      };
      const req = store.put(item);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async preloadAudios(hashes: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    for (const h of hashes) {
      const url = await this.getAudio(h);
      if (url) results[h] = url;
    }
    return results;
  }

  async cleanupOldAudios(maxAge = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const db = await this.ensureDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const idx = store.index("lastAccessed");
      const cutoff = Date.now() - maxAge;
      const cursorReq = idx.openCursor(IDBKeyRange.upperBound(cutoff));

      cursorReq.onerror = () => reject(cursorReq.error);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
    });
  }

  /* 关闭连接（如应用卸载时） */
  close(): void {
    this.db?.close();
    this.db = null;
  }

  /* ---------- 私有：更新 lastAccessed ---------- */
  private async updateLastAccessed(hash: string): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(this.storeName, "readwrite");
    const store = tx.objectStore(this.storeName);
    const req = store.get(hash);
    req.onsuccess = () => {
      if (req.result) {
        const item: AudioCacheItem = {
          ...req.result,
          lastAccessed: Date.now(),
        };
        store.put(item);
      }
    };
  }
}

// 单例导出，全局共用
export const audioCache = new AudioCache();
