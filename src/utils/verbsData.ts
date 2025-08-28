import axios from "axios";
import { indexedDBService } from "../services/indexedDBService";
// 从网络获取数据
export const fetchVerbsFromNetwork = async (): Promise<{
  data: VerbData[];
  lastUpdated: string;
  cacheTtl: number;
}> => {
  try {
    const response = await axios.get<VerbsResponse>(
      "https://app.deutik.com/verbs/table",
      {
        timeout: 10000,
        headers: {
          Accept: "application/json",
        },
      }
    );

    const lastUpdated = new Date().toISOString();
    return {
      data: response.data.data,
      lastUpdated,
      cacheTtl: response.data.metadata.cacheTtl,
    };
  } catch (error) {
    throw new Error(
      axios.isAxiosError(error)
        ? error.message
        : "Failed to fetch verbs data from network"
    );
  }
};

export interface VerbData {
  lemma: string;
  third_singular: string;
  past: string;
  perfect: string;
  cgroup: string;
  comments: string;
}

export interface VerbsResponse {
  metadata: {
    total: number;
    columns: Array<{
      key: string;
      label: string;
      width: string;
    }>;
    lastUpdated: string;
    cacheTtl: number;
  };
  data: VerbData[];
}

const CACHE_KEY = "verbs_data";

// 获取数据（优先使用缓存）
export const getVerbsData = async (): Promise<{
  data: any[];
  fromCache: boolean;
  error?: string;
}> => {
  try {
    // 首先尝试从缓存获取
    const cachedData = await indexedDBService.getData("verbs", CACHE_KEY);

    if (
      cachedData &&
      isCacheValid(cachedData.lastUpdated, cachedData.cacheTtl)
    ) {
      return {
        data: cachedData.data,
        fromCache: true,
      };
    }

    // 缓存无效或不存在，从网络获取
    const networkData = await fetchVerbsFromNetwork();

    // 保存到缓存
    await indexedDBService.setData("verbs", CACHE_KEY, {
      data: networkData.data,
      lastUpdated: networkData.lastUpdated,
      cacheTtl: networkData.cacheTtl,
    });

    return {
      data: networkData.data,
      fromCache: false,
    };
  } catch (error) {
    // 网络请求失败，尝试使用缓存数据（即使可能过期）
    const cachedData = await indexedDBService.getData("verbs", CACHE_KEY);
    if (cachedData) {
      return {
        data: cachedData.data,
        fromCache: true,
        error:
          error instanceof Error
            ? error.message
            : "Network request failed, using cached data",
      };
    }

    throw error;
  }
};

// 强制刷新数据
export const refreshVerbsData = async (): Promise<any[]> => {
  const networkData = await fetchVerbsFromNetwork();

  await indexedDBService.setData("verbs", CACHE_KEY, {
    data: networkData.data,
    lastUpdated: networkData.lastUpdated,
    cacheTtl: networkData.cacheTtl,
  });

  return networkData.data;
};

// 清空缓存
export const clearVerbsCache = async (): Promise<void> => {
  await indexedDBService.deleteData("verbs", CACHE_KEY);
};

// 检查缓存是否有效
const isCacheValid = (lastUpdated: string, cacheTtl: number): boolean => {
  const lastUpdatedTime = new Date(lastUpdated).getTime();
  const currentTime = Date.now();
  return currentTime - lastUpdatedTime < cacheTtl * 1000;
};
