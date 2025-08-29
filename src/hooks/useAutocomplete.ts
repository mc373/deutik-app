import { useState, useEffect, useRef } from "react";

export interface UseAutocompleteReturn {
  inputValue: string;
  setInputValue: (v: string) => void;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export const useAutocomplete = (apiUrl: string): UseAutocompleteReturn => {
  const [inputValue, setInputValue] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
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
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${apiUrl}?term=${encodeURIComponent(inputValue)}`,
          {
            signal,
            headers: { Accept: "application/json" },
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: string[] = await response.json();
        setSuggestions(data || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Fetch error:", err);
          setError("Failed to fetch suggestions");
          setSuggestions([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();

    // 清理函数
    return () => controller.abort();
  }, [inputValue, apiUrl]);

  return {
    inputValue,
    setInputValue,
    suggestions,
    isLoading,
    error,
    clearError: () => setError(null),
  };
};
