// src/contexts/GlobalStateContext.tsx
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// 定义全局状态类型
type GlobalState = {
  language: "en" | "de" | "zh";
  theme: "light" | "dark";
  curWordList?: [string]; // 当前单词列表
  userPreferences: {
    fontSize: number;
    reduceAnimations: boolean;
  };
  // 可以继续添加其他全局状态
};

// 定义Context类型
type GlobalStateContextType = {
  state: GlobalState;
  updateState: (updater: (prevState: GlobalState) => GlobalState) => void;
  setLanguage: (lang: GlobalState["language"]) => void;
  toggleTheme: () => void;
  // 其他操作方法...
};

// 继续在 GlobalStateContext.tsx 中

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
  userPreferences: {
    fontSize: 16,
    reduceAnimations: false,
  },
};

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalState>(initialState);

  // 持久化状态到localStorage
  useEffect(() => {
    localStorage.setItem("appLanguage", state.language);
    localStorage.setItem("appTheme", state.theme);
    document.documentElement.lang = state.language;
    document.documentElement.dataset.theme = state.theme;
  }, [state.language, state.theme]);

  // 更新状态的方法
  const updateState = (updater: (prevState: GlobalState) => GlobalState) => {
    setState((prev) => {
      const newState = updater(prev);
      return newState;
    });
  };

  // 专门的语言设置方法
  const setLanguage = (lang: GlobalState["language"]) => {
    updateState((prev) => ({
      ...prev,
      language: lang,
    }));
  };

  // 主题切换方法
  const toggleTheme = () => {
    updateState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  };

  // 更新用户偏好
  const updatePreferences = (
    prefs: Partial<GlobalState["userPreferences"]>
  ) => {
    updateState((prev) => ({
      ...prev,
      userPreferences: {
        ...prev.userPreferences,
        ...prefs,
      },
    }));
  };

  return (
    <GlobalStateContext.Provider
      value={{
        state,
        updateState,
        setLanguage,
        toggleTheme,
      }}
    >
      {children}
    </GlobalStateContext.Provider>
  );
}

// 继续在 GlobalStateContext.tsx 中

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
}
