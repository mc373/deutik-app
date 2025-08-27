import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import Papa from "papaparse";
// 定义单词类型
// type WordItem = {
//   word: string;
//   german: string;
//   translation: string;
//   pos: string;
//   level: string;
//   // 可以添加更多字段
// };
type WordItem = {
  word: string; // 唯一标识符
};
// 定义全局状态类型
type GlobalState = {
  language: "en" | "de" | "zh";
  theme: "light" | "dark";
  curWordList: WordItem[]; // 当前单词列表
  currentLevel: string; // 当前选择的CEFR级别

  // 可以继续添加其他全局状态
};

// 定义Context类型
type GlobalStateContextType = {
  state: GlobalState;
  updateState: (updater: (prevState: GlobalState) => GlobalState) => void;
  setLanguage: (lang: GlobalState["language"]) => void;
  toggleTheme: () => void;
  setCurrentLevel: (level: string) => void;
  loadWordList: (level: string) => Promise<void>;
  updateWordList: (words: WordItem[]) => void;
  // 其他操作方法...
};

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(
  undefined
);

// 初始状态
const initialState: GlobalState = {
  language: (() => {
    if (typeof window !== "undefined") {
      const savedLang = localStorage.getItem("appLanguage");
      if (savedLang && ["en", "de", "zh"].includes(savedLang)) {
        return savedLang as GlobalState["language"];
      }

      const browserLang = navigator.language.split("-")[0];
      return ["en", "de", "zh"].includes(browserLang)
        ? (browserLang as GlobalState["language"])
        : "en";
    }
    return "en";
  })(),
  theme: "light",
  curWordList: [],
  currentLevel: localStorage.getItem("currentLevel") || "A1",
};

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalState>(initialState);

  // 持久化状态到localStorage
  useEffect(() => {
    localStorage.setItem("appLanguage", state.language);
    localStorage.setItem("appTheme", state.theme);
    localStorage.setItem("currentLevel", state.currentLevel);
    document.documentElement.lang = state.language;
    document.documentElement.dataset.theme = state.theme;
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
    (lang: GlobalState["language"]) => {
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

  return (
    <GlobalStateContext.Provider
      value={{
        state,
        updateState,
        setLanguage,
        toggleTheme,
        setCurrentLevel,
        loadWordList,
        updateWordList,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
}
