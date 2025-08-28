// hooks/useVerbsData.ts
import { useState, useEffect, useCallback } from "react";
import {
  getVerbsData,
  refreshVerbsData,
  clearVerbsCache,
} from "../utils/verbsData";

export interface VerbData {
  lemma: string;
  third_singular: string;
  past: string;
  perfect: string;
  cgroup: string;
  comments: string;
}

export const useVerbsData = () => {
  const [data, setData] = useState<VerbData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getVerbsData();
      setData(result.data);
      setFromCache(result.fromCache);

      if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch verbs data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const newData = await refreshVerbsData();
      setData(newData);
      setFromCache(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await clearVerbsCache();
      // 清空缓存后重新获取数据
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear cache");
    }
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    clearCache,
    fromCache,
  };
};

export default useVerbsData;
