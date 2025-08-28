// hooks/useIndexedDB.ts
import { useState, useCallback } from "react";
import { indexedDBService } from "../services/indexedDBService";

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
    async (storeName: string, key: string) => {
      if (!isReady) {
        await initialize();
      }
      return indexedDBService.getData(storeName, key);
    },
    [isReady, initialize]
  );

  const setData = useCallback(
    async (storeName: string, key: string, value: any) => {
      if (!isReady) {
        await initialize();
      }
      return indexedDBService.setData(storeName, key, value);
    },
    [isReady, initialize]
  );

  return {
    isReady,
    initialize,
    getData,
    setData,
    deleteData: indexedDBService.deleteData.bind(indexedDBService),
    clearStore: indexedDBService.clearStore.bind(indexedDBService),
  };
};
