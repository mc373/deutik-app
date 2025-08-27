import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { IntlProvider } from "react-intl";
import Papa from "papaparse";
import enMessages from "../locales/en.json";
import zhMessages from "../locales/zh.json";
import deMessages from "../locales/de.json";
import trMessages from "../locales/tr.json";
import arMessages from "../locales/ar.json";

// 定义单词类型
type WordItem = {
  word: string;
  id?: string;
  level?: string;
  // 可以添加更多字段
};

// 定义语言类型
export type Language = "en" | "de" | "zh" | "tr" | "ar";

// 定义全局状态类型
type GlobalState = {
  language: Language;
  theme: "light" | "dark";
  curWordList: WordItem[];
  currentLevel: string;
  curWord: string | ""; // 添加当前选中的单词
};

// 定义Context类型
type AppContextType = {
  state: GlobalState;
  // 状态更新方法
  updateState: (updater: (prevState: GlobalState) => GlobalState) => void;
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  setCurrentLevel: (level: string) => void;
  loadWordList: (level: string) => Promise<void>;
  updateWordList: (words: WordItem[]) => void;
  // 添加curWord相关方法
  setCurWord: (word: string | null) => void;
  clearCurWord: () => void;
  // 翻译方法
  t: (key: string, values?: Record<string, any>) => string;
  // 当前语言
  currentLanguage: Language;
  // 可用语言列表
  availableLanguages: { code: Language; name: string; nativeName: string }[];
};

const messagesMap = {
  en: enMessages,
  zh: zhMessages,
  de: deMessages,
  tr: trMessages,
  ar: arMessages,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

// 语言显示名称映射
const languageNames: Record<Language, { name: string; nativeName: string }> = {
  en: { name: "English", nativeName: "English" },
  de: { name: "German", nativeName: "Deutsch" },
  zh: { name: "Chinese", nativeName: "中文" },
  tr: { name: "Turkish", nativeName: "Türkçe" },
  ar: { name: "Arabic", nativeName: "العربية" },
};

// 初始状态
const initialState: GlobalState = {
  language: (() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("appLanguage");
      if (savedLang && Object.keys(messagesMap).includes(savedLang)) {
        return savedLang as Language;
      }

      const browserLang = navigator.language.split("-")[0];
      return Object.keys(messagesMap).includes(browserLang)
        ? (browserLang as Language)
        : "en";
    }
    return "en";
  })(),
  theme: (() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("appTheme");
      return (savedTheme as "light" | "dark") || "light";
    }
    return "light";
  })(),
  curWordList: [],
  currentLevel: (() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("currentLevel") || "A1";
    }
    return "A1";
  })(),
  curWord: "", // 初始化为null
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalState>(initialState);

  // 持久化状态到localStorage
  useEffect(() => {
    localStorage.setItem("appLanguage", state.language);
    localStorage.setItem("appTheme", state.theme);
    localStorage.setItem("currentLevel", state.currentLevel);

    // 设置HTML属性
    document.documentElement.lang = state.language;
    document.documentElement.dataset.theme = state.theme;

    // 设置RTL支持（阿拉伯语）
    if (state.language === "ar") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [state.language, state.theme, state.currentLevel]);

  // 更新状态的方法
  const updateState = useCallback(
    (updater: (prevState: GlobalState) => GlobalState) => {
      setState(updater);
    },
    []
  );

  // 专门的语言设置方法
  const setLanguage = useCallback(
    (lang: Language) => {
      updateState((prev) => ({
        ...prev,
        language: lang,
      }));
    },
    [updateState]
  );

  // 主题切换方法
  const toggleTheme = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  }, [updateState]);

  // 设置当前级别
  const setCurrentLevel = useCallback(
    (level: string) => {
      updateState((prev) => ({
        ...prev,
        currentLevel: level,
      }));
    },
    [updateState]
  );

  // 加载单词列表
  const loadWordList = useCallback(
    async (level: string) => {
      try {
        const response = await fetch(`/data/word_${level.toLowerCase()}.csv`);
        const text = await response.text();

        return new Promise<void>((resolve) => {
          Papa.parse(text, {
            header: true,
            complete: (results) => {
              const words = results.data.map((word: any, index: number) => ({
                ...word,
                id: `${level}-${index}`,
                level,
              }));

              updateState((prev) => ({
                ...prev,
                curWordList: words,
                currentLevel: level,
              }));
              resolve();
            },
            error: (error: any) => {
              console.error("CSV解析错误:", error);
              resolve();
            },
          });
        });
      } catch (error) {
        console.error("加载单词列表失败:", error);
      }
    },
    [updateState]
  );

  // 直接更新单词列表
  const updateWordList = useCallback(
    (words: WordItem[]) => {
      updateState((prev) => ({
        ...prev,
        curWordList: words,
      }));
    },
    [updateState]
  );

  // 翻译函数
  const t = useCallback(
    (key: string, values?: Record<string, any>): string => {
      const message =
        messagesMap[state.language][
          key as keyof (typeof messagesMap)[Language]
        ];
      if (!message) return key;

      if (values) {
        return Object.entries(values).reduce(
          (msg, [key, value]) =>
            typeof msg === "string"
              ? msg.replace(`{${key}}`, String(value))
              : msg,
          message as string
        );
      }
      return message as string;
    },
    [state.language]
  );

  // 可用语言列表
  const availableLanguages = Object.entries(languageNames).map(
    ([code, names]) => ({
      code: code as Language,
      name: names.name,
      nativeName: names.nativeName,
    })
  );

  // 设置当前单词
  const setCurWord = useCallback(
    (word: string | null) => {
      updateState((prev) => ({
        ...prev,
        curWord: word ?? "",
      }));
    },
    [updateState]
  );

  // 清空当前单词
  const clearCurWord = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      curWord: "",
    }));
  }, [updateState]);
  const contextValue: AppContextType = {
    state,
    updateState,
    setLanguage,
    toggleTheme,
    setCurrentLevel,
    loadWordList,
    updateWordList,
    t,
    currentLanguage: state.language,
    availableLanguages,
    setCurWord, // 添加setCurWord方法
    clearCurWord, // 添加clearCurWord方法
  };

  return (
    <AppContext.Provider value={contextValue}>
      <IntlProvider
        locale={state.language}
        messages={messagesMap[state.language]}
      >
        {children}
      </IntlProvider>
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
