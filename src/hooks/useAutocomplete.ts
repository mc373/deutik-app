import { useState, useEffect, useRef } from "react";

export interface UseAutocompleteReturn {
  inputValue: string;
  setInputValue: (v: string) => void;
  langValue: string;
  setLanguageChange: (v: string) => void;
  suggestions: string[];
  rawSuggestions: any[]; // 新增：存储原始建议数据
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAutocomplete = (): UseAutocompleteReturn => {
  const [inputValue, setInputValue] = useState<string>("");
  const [langValue, setLanguageChange] = useState<string>("de"); // 默认德语
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [rawSuggestions, setRawSuggestions] = useState<any[]>([]); // 存储原始数据
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 保存最新的 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // 取消尚未完成的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    const fetchSuggestions = async (): Promise<void> => {
      if (inputValue.trim().length < 1) {
        setSuggestions([]);
        setRawSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        let currentApiUrl;
        if (langValue === "de") {
          currentApiUrl =
            "https://app.deutik.com/api/autocomplete?term=" +
            encodeURIComponent(inputValue);
        } else {
          currentApiUrl =
            "https://app.deutik.com/search/search?q=" +
            encodeURIComponent(inputValue) +
            "&lang=" +
            langValue +
            "&limit=5";
        }

        const response = await fetch(currentApiUrl, {
          signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 根据语言类型处理不同的响应结构
        if (langValue === "de") {
          // 德语API返回字符串数组
          setSuggestions(data || []);
          setRawSuggestions(
            data ? data.map((item: string) => ({ lemma: item })) : []
          );
        } else {
          // 其他语言API返回 { results: [...] } 结构
          const results = data?.results || [];
          setSuggestions(
            results.map((item: any) => `${item.lemma} - ${item.meaning}`)
          );
          setRawSuggestions(results);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Fetch error:", err);
          setError("Failed to fetch suggestions: " + err.message);
          setSuggestions([]);
          setRawSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();

    // 清理函数
    return () => controller.abort();
  }, [inputValue, langValue]);

  return {
    inputValue,
    setInputValue,
    langValue,
    setLanguageChange,
    suggestions,
    rawSuggestions, // 返回原始数据
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
