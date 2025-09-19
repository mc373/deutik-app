// hooks/useIndexedDB.ts
import { useState, useCallback } from "react";
import { indexedDBService, StoreName } from "../services/indexedDBService";

export const useIndexedDB = () => {
  const [isReady, setIsReady] = useState(false);

  const initialize = useCallback(async () => {
    try {
      await indexedDBService.init();
      setIsReady(true);
      return true;
    } catch (error) {
      console.error("Failed to initialize IndexedDB:", error);
      return false;
    }
  }, []);

  const getData = useCallback(
    async (storeName: StoreName, key: string) => {
      if (!isReady) {
        await initialize();
      }
      return indexedDBService.get(storeName, key);
    },
    [isReady, initialize]
  );

  const setData = useCallback(
    async (storeName: StoreName, key: string, value: any) => {
      if (!isReady) {
        await initialize();
      }
      return indexedDBService.set(storeName, key, value);
    },
    [isReady, initialize]
  );

  return {
    isReady,
    initialize,
    getData,
    setData,
    deleteData: indexedDBService.delete.bind(indexedDBService),
    clearStore: indexedDBService.clear.bind(indexedDBService),
  };
};
