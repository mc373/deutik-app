import { WordData } from "../components/MainCard";

export interface WordRecord {
  word: string;
  cefr_level: string;
  jsonData: WordData;
}
export async function initializeDB(): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("WordsDatabase", 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("words")) {
        const store = db.createObjectStore("words", { keyPath: "word" });
        store.createIndex("cefr_level", "cefr_level", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  try {
    // 第一步：检查是否已有数据（使用独立事务）
    const isEmpty = await new Promise<boolean>((resolve) => {
      const tx = db.transaction("words", "readonly");
      const store = tx.objectStore("words");
      const req = store.count();
      req.onsuccess = () => resolve(req.result === 0);
    });

    if (!isEmpty) {
      db.close();
      return;
    }

    // 第二步：获取数据
    const response = await fetch("https://r2.deutik.com/json10000.json");
    const { dt_word_json } = await response.json();
    const words = dt_word_json.map((item: any) => ({
      word: item.lemma,
      cefr_level: item.cefr_level,
      jsonData: JSON.parse(item.jsonstr),
    }));

    // 第三步：插入数据（使用新事务）
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("words", "readwrite");
      const store = tx.objectStore("words");
      words.forEach((word: any) => store.put(word));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    db.close();
  } catch (err) {
    db?.close();
    throw err;
  }
}

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("WordsDatabase", 1);

    request.onsuccess = () => {
      dbInstance = request.result;

      // 添加错误处理和关闭逻辑
      dbInstance.onerror = (e) => {
        console.error("Database error:", e);
        closeDB();
      };

      // 当版本变更时关闭连接
      dbInstance.onversionchange = () => {
        closeDB();
      };

      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

function closeDB() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export async function getWordByKey(
  word: string
): Promise<WordRecord | undefined> {
  const db = await getDB(); // 使用共享连接

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("words", "readonly");
    const store = transaction.objectStore("words");
    const request = store.get(word);

    request.onsuccess = () => resolve(request.result as WordRecord);
    request.onerror = () => reject(request.error);

    // 不再在这里关闭db
  });
}
