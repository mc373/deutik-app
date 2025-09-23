// indexedDBService.ts
import { openDB, IDBPDatabase, DBSchema } from "idb";

export interface AudioData {
  hash: string;
  data: string;
  format: string;
  sample_rate?: number;
  bits_per_sample?: number;
}

interface DeutikDB extends DBSchema {
  verbs: { key: string; value: any };
  settings: { key: string; value: any };
  ttsCache: { key: string; value: AudioData };
}

const STORE_NAMES = {
  VERBS: "verbs",
  SETTINGS: "settings",
  TTS_CACHE: "ttsCache",
} as const;

type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

class IndexedDBService {
  private static instance: IndexedDBService;
  private db: IDBPDatabase<DeutikDB> | null = null;
  private dbName = "DeutikAppDatabase";
  private version = 1;
  private initPromise: Promise<IDBPDatabase<DeutikDB>> | null = null;

  private constructor() {}

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  // Added ready method to ensure database is initialized
  async ready(): Promise<IDBPDatabase<DeutikDB>> {
    return this.getDB();
  }

  private async getDB(): Promise<IDBPDatabase<DeutikDB>> {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = openDB<DeutikDB>(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAMES.VERBS)) {
          db.createObjectStore(STORE_NAMES.VERBS);
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
          db.createObjectStore(STORE_NAMES.SETTINGS);
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.TTS_CACHE)) {
          db.createObjectStore(STORE_NAMES.TTS_CACHE, { keyPath: "hash" });
        }
      },
    });

    this.db = await this.initPromise;
    return this.db;
  }

  async getAudio(hash: string): Promise<AudioData | null> {
    try {
      const db = await this.getDB();
      const result = await db.get(STORE_NAMES.TTS_CACHE, hash);
      return result || null;
    } catch (error) {
      console.error("获取音频缓存失败:", error);
      return null;
    }
  }

  async saveAudio(audioData: AudioData): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(STORE_NAMES.TTS_CACHE, audioData);
    } catch (error) {
      console.error("保存音频缓存失败:", error);
      throw error;
    }
  }

  async clearAudioCache(): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear(STORE_NAMES.TTS_CACHE);
    } catch (error) {
      console.error("清空音频缓存失败:", error);
      throw error;
    }
  }

  async getAllCachedHashes(): Promise<string[]> {
    try {
      const db = await this.getDB();
      return await db.getAllKeys(STORE_NAMES.TTS_CACHE);
    } catch (error) {
      console.error("获取缓存哈希列表失败:", error);
      return [];
    }
  }

  async getCacheStats(): Promise<{ count: number; totalSize: number }> {
    try {
      const db = await this.getDB();
      const allData = await db.getAll(STORE_NAMES.TTS_CACHE);

      const count = allData.length;
      const totalSize = allData.reduce((size, item) => {
        const decodedSize = Math.ceil((item.data.length * 3) / 4);
        return size + decodedSize;
      }, 0);

      return {
        count,
        totalSize: Math.round(totalSize / 1024),
      };
    } catch (error) {
      console.error("获取缓存统计失败:", error);
      return { count: 0, totalSize: 0 };
    }
  }

  async get(storeName: StoreName, key: string): Promise<any> {
    try {
      const db = await this.getDB();
      const result = await db.get(storeName, key);
      return result || null;
    } catch (error) {
      console.error(`获取存储 ${storeName} 的数据失败:`, error);
      return null;
    }
  }

  async set(storeName: StoreName, key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(storeName, value, key);
    } catch (error) {
      console.error(`保存到存储 ${storeName} 失败:`, error);
      throw error;
    }
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(storeName, key);
    } catch (error) {
      console.error(`删除存储 ${storeName} 的数据失败:`, error);
      throw error;
    }
  }

  async clear(storeName: StoreName): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear(storeName);
    } catch (error) {
      console.error(`清空存储 ${storeName} 失败:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

export const indexedDBService = IndexedDBService.getInstance();
