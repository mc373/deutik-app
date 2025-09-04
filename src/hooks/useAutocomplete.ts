import { useState, useEffect, useRef } from "react";

export interface UseAutocompleteReturn {
  inputValue: string;
  setInputValue: (v: string) => void;
  langValue: string;
  setLanguageChange: (v: string) => void;
  suggestions: string[];
  rawSuggestions: any[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  detectedLanguage: string;
  userManuallyChanged: boolean; // 新增：用户是否手动更改过语言
}

// 改进的语言检测函数，优先德语
const detectLanguage = (text: string): string => {
  if (!text || text.trim().length === 0) return "de";

  const trimmedText = text.trim();

  // 1. 首先检测非拉丁字母的语言
  if (/[\u4e00-\u9fff]/.test(trimmedText)) {
    return "zh";
  }

  if (/[\u0600-\u06FF]/.test(trimmedText)) {
    return "ar";
  }

  if (/[ğĞıİşŞçÇöÖüÜ]/.test(trimmedText)) {
    return "tr";
  }

  // 2. 检测德语特有字符 (ä, ö, ü, ß)
  if (/[äöüßÄÖÜ]/.test(trimmedText)) {
    return "de";
  }

  // 3. 检测常见德语单词模式
  const germanPatterns = [
    /sch/i,
    /ch/i,
    /ei/i,
    /ie/i,
    /au/i,
    /eu/i,
    /äu/i,
    /ung$/,
    /heit$/,
    /keit$/,
    /schaft$/,
    /tion$/i,
  ];

  const isLikelyGerman = germanPatterns.some((pattern) =>
    pattern.test(trimmedText)
  );
  if (isLikelyGerman) {
    return "de";
  }

  // 4. 检测常见英语单词模式
  const englishPatterns = [
    /th/i,
    /sh/i,
    /ch/i,
    /ph/i,
    /gh/i,
    /ing$/,
    /ed$/,
    /tion$/,
    /sion$/,
    /ment$/,
    /able$/i,
  ];

  const isLikelyEnglish = englishPatterns.some((pattern) =>
    pattern.test(trimmedText)
  );
  if (isLikelyEnglish) {
    return "en";
  }

  // 5. 默认优先德语（因为这是德语学习应用）
  return "de";
};

export const useAutocomplete = (): UseAutocompleteReturn => {
  const [inputValue, setInputValue] = useState<string>("");
  const [langValue, setLanguageChange] = useState<string>("de");
  const [detectedLanguage, setDetectedLanguage] = useState<string>("de");
  const [userManuallyChanged, setUserManuallyChanged] =
    useState<boolean>(false); // 新增：用户手动更改标志
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [rawSuggestions, setRawSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateInputValueWithDetection = (value: string) => {
    setInputValue(value);

    if (value.trim().length > 0) {
      const detectedLang = detectLanguage(value);
      setDetectedLanguage(detectedLang);

      // 只有当用户没有手动选择过语言时才自动切换
      if (!userManuallyChanged) {
        setLanguageChange(detectedLang);
      }
    } else {
      setDetectedLanguage("de");
      if (!userManuallyChanged) {
        setLanguageChange("de");
      }
    }
  };

  // 新增：处理用户手动语言更改
  const handleLanguageChange = (lang: string) => {
    setLanguageChange(lang);
    setUserManuallyChanged(true); // 标记用户已手动更改
  };

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    var chk = detectLanguage(inputValue);
    if (chk !== "de" && chk !== "en" && chk !== langValue) {
      setLanguageChange(chk);
    } else {
      chk = langValue;
    }
    console.log("useeffect:" + langValue + " " + inputValue);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    function flattenGerman(str: string): string {
      const MAP: { [key: string]: string } = {
        ä: "a",
        ö: "o",
        ü: "u",
        ß: "s",
        Ä: "a",
        Ö: "o",
        Ü: "u",
      };

      return str.replace(/[äöüßÄÖÜ]/g, (c) => MAP[c]);
    }
    const fetchSuggestions = async (): Promise<void> => {
      if (inputValue.trim().length < 1) {
        setSuggestions([]);
        setRawSuggestions([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      console.log("fetchSuggestions:" + (langValue + " " + inputValue));
      try {
        let currentApiUrl;
        if (chk === "de") {
          currentApiUrl =
            "https://app.deutik.com/api/autocomplete?term=" +
            encodeURIComponent(flattenGerman(inputValue));
        } else {
          currentApiUrl =
            "https://app.deutik.com/search/search?q=" +
            encodeURIComponent(inputValue) +
            "&lang=" +
            langValue +
            "&limit=20";
        }

        const response = await fetch(currentApiUrl, {
          signal,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (langValue === "de") {
          const data1 = data.map((item: string) => item.split(";")[1]);
          setSuggestions(data1 || []);
          setRawSuggestions(
            data1 ? data1.map((item: string) => ({ lemma: item })) : []
          );
        } else {
          console.log("Fetched suggestions data:", data);
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

    return () => controller.abort();
  }, [inputValue, langValue]);

  return {
    inputValue,
    setInputValue: updateInputValueWithDetection,
    langValue,
    setLanguageChange: handleLanguageChange, // 使用新的处理函数
    suggestions,
    rawSuggestions,
    isLoading,
    error,
    clearError: () => setError(null),
    detectedLanguage,
    userManuallyChanged,
  };
};
