// indexedDBService.ts
import { openDB, IDBPDatabase, DBSchema } from "idb";

/* ---------------- 类型定义（可按需扩展） ---------------- */
interface DeutikDB extends DBSchema {
  verbs: {
    key: string;
    value: any;
  };
  settings: {
    key: string;
    value: any;
  };
  ttsCache: {
    key: string;
    value: { hash: string; data: ArrayBuffer };
  };
}

/* ---------------- 常量 ---------------- */
export const STORE_NAMES = {
  VERBS: "verbs",
  SETTINGS: "settings",
  TTS_CACHE: "ttsCache",
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

/* ---------------- 单例 service ---------------- */
class IndexedDBService {
  private static instance: IndexedDBService;
  private db: IDBPDatabase<DeutikDB> | null = null;
  private dbName = "DeutikAppDatabase";
  private version = 1; // 初始版本，后续动态抬高
  private isInitializing = false;
  private initPromise: Promise<IDBPDatabase<DeutikDB>> | null = null;

  private constructor() {}

  static getInstance(): IndexedDBService {
    if (!IndexedDBService.instance) {
      IndexedDBService.instance = new IndexedDBService();
    }
    return IndexedDBService.instance;
  }

  /* 获取当前真实版本（临时连接） */
  private async getCurrentVersion(): Promise<number> {
    const temp = await openDB<DeutikDB>(this.dbName);
    const v = temp.version;
    temp.close();
    return v;
  }

  /* 初始化（支持自动升级） */
  async init(): Promise<IDBPDatabase<DeutikDB>> {
    if (this.db) return this.db;
    if (this.isInitializing && this.initPromise) return this.initPromise!;

    this.isInitializing = true;

    // 动态决定是否需要升级
    const currentVer = await this.getCurrentVersion();
    const tempDB = await openDB<DeutikDB>(this.dbName, currentVer);
    const needTts = !tempDB.objectStoreNames.contains(STORE_NAMES.TTS_CACHE);
    tempDB.close();

    this.version = needTts ? currentVer + 1 : currentVer;

    this.initPromise = openDB<DeutikDB>(this.dbName, this.version, {
      upgrade(db) {
        // 创建缺失的 store
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

    try {
      this.db = await this.initPromise;
      return this.db;
    } catch (e) {
      this.isInitializing = false;
      this.initPromise = null;
      throw e;
    } finally {
      this.isInitializing = false;
    }
  }

  /* 对外唯一入口：保证 ttsCache 存在并返回 db */
  async ready(): Promise<IDBPDatabase<DeutikDB>> {
    return this.init();
  }

  /* 基础 CRUD（已带类型） */
  async get(storeName: StoreName, key: string) {
    const db = await this.ready();
    return db.get(storeName, key);
  }

  async set(storeName: StoreName, key: string, value: any) {
    const db = await this.ready();
    return db.put(storeName, value, key);
  }

  async delete(storeName: StoreName, key: string) {
    const db = await this.ready();
    return db.delete(storeName, key);
  }

  async clear(storeName: StoreName) {
    const db = await this.ready();
    return db.clear(storeName);
  }

  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const indexedDBService = IndexedDBService.getInstance();
