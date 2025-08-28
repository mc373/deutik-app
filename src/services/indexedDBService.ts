import { openDB, IDBPDatabase } from 'idb';

// 定义存储名称常量
export const STORE_NAMES = {
  VERBS: 'verbs',
  SETTINGS: 'settings',
} as const;

export type StoreName = keyof typeof STORE_NAMES;

class IndexedDBService {
  private static instance: IndexedDBService;
  private db: IDBPDatabase | null = null;
  private dbName = 'DeutikAppDatabase';
  private version = 1;
  private isInitializing = false;
  private initPromise: Promise<IDBPDatabase> | null = null;

  private constructor() {}

  public static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  async init(): Promise<IDBPDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = openDB(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAMES.VERBS)) {
          db.createObjectStore(STORE_NAMES.VERBS);
        }
        if (!db.objectStoreNames.contains(STORE_NAMES.SETTINGS)) {
          db.createObjectStore(STORE_NAMES.SETTINGS);
        }
      },
    });

    try {
      this.db = await this.initPromise;
      return this.db;
    } catch (error) {
      this.isInitializing = false;
      this.initPromise = null;
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  async getDB(): Promise<IDBPDatabase> {
    if (this.db) {
      return this.db;
    }
    return this.init();
  }

  // 使用具体的字符串类型
  async getData(storeName: string, key: string): Promise<any> {
    try {
      const db = await this.getDB();
      return await db.get(storeName, key);
    } catch (error) {
      console.error('Error getting data from IndexedDB:', error);
      return null;
    }
  }

  async setData(storeName: string, key: string, value: any): Promise<void> {
    try {
      const db = await this.getDB();
      await db.put(storeName, value, key);
    } catch (error) {
      console.error('Error saving data to IndexedDB:', error);
    }
  }

  async deleteData(storeName: string, key: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.delete(storeName, key);
    } catch (error) {
      console.error('Error deleting data from IndexedDB:', error);
    }
  }

  async clearStore(storeName: string): Promise<void> {
    try {
      const db = await this.getDB();
      await db.clear(storeName);
    } catch (error) {
      console.error('Error clearing store:', error);
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const indexedDBService = IndexedDBService.getInstance();