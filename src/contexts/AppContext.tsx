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
import { useDisclosure } from "@mantine/hooks"; // 新增导入
import enMessages from "../locales/en.json";
import zhMessages from "../locales/zh.json";
import deMessages from "../locales/de.json";
import trMessages from "../locales/tr.json";
import arMessages from "../locales/ar.json";

type WordItem = {
  word: string;
  id?: string;
  level?: string;
};

export type Language = "en" | "de" | "zh" | "tr" | "ar";

type GlobalState = {
  language: Language;
  theme: "light" | "dark";
  curWordList: WordItem[];
  currentLevel: string;
  curWord: string;
};

// 新增 Modal 控制状态类型
type ModalState = {
  opened: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
};

type AppContextType = {
  state: GlobalState;
  updateState: (updater: (prevState: GlobalState) => GlobalState) => void;
  setLanguage: (lang: Language) => void;
  toggleTheme: () => void;
  setCurrentLevel: (level: string) => void;
  loadWordList: (level: string) => Promise<void>;
  updateWordList: (words: WordItem[]) => void;
  setCurWord: (word: string | null) => void;
  clearCurWord: () => void;
  t: (key: string, values?: Record<string, any>) => string;
  currentLanguage: Language;
  availableLanguages: { code: Language; name: string; nativeName: string }[];
  // 新增 Modal 控制方法
  modal: ModalState;
};

const messagesMap = {
  en: enMessages,
  zh: zhMessages,
  de: deMessages,
  tr: trMessages,
  ar: arMessages,
};

const languageNames = {
  en: { name: "English", nativeName: "English" },
  de: { name: "German", nativeName: "Deutsch" },
  zh: { name: "Chinese", nativeName: "中文" },
  tr: { name: "Turkish", nativeName: "Türkçe" },
  ar: { name: "Arabic", nativeName: "العربية" },
};

const getInitialState = (): GlobalState => ({
  language:
    typeof window !== "undefined"
      ? (localStorage.getItem("appLanguage") as Language) ||
        (Object.keys(messagesMap).includes(navigator.language.split("-")[0])
          ? (navigator.language.split("-")[0] as Language)
          : "en")
      : "en",
  theme:
    typeof window !== "undefined"
      ? (localStorage.getItem("appTheme") as "light" | "dark") || "light"
      : "light",
  curWordList: [],
  currentLevel:
    typeof window !== "undefined"
      ? localStorage.getItem("currentLevel") || "A1"
      : "A1",
  curWord: "",
});

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GlobalState>(getInitialState);
  // 新增 useDisclosure hook
  const [opened, { toggle, open, close }] = useDisclosure(false);

  useEffect(() => {
    localStorage.setItem("appLanguage", state.language);
    localStorage.setItem("appTheme", state.theme);
    localStorage.setItem("currentLevel", state.currentLevel);

    document.documentElement.lang = state.language;
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";
  }, [state.language, state.theme, state.currentLevel]);

  const updateState = useCallback(
    (updater: (prevState: GlobalState) => GlobalState) => {
      setState(updater);
    },
    []
  );

  const setLanguage = useCallback(
    (lang: Language) => {
      updateState((prev) => ({ ...prev, language: lang }));
    },
    [updateState]
  );

  const toggleTheme = useCallback(() => {
    updateState((prev) => ({
      ...prev,
      theme: prev.theme === "light" ? "dark" : "light",
    }));
  }, [updateState]);

  const setCurrentLevel = useCallback(
    (level: string) => {
      updateState((prev) => ({ ...prev, currentLevel: level }));
    },
    [updateState]
  );

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

  const updateWordList = useCallback(
    (words: WordItem[]) => {
      updateState((prev) => ({ ...prev, curWordList: words }));
    },
    [updateState]
  );

  const t = useCallback(
    (key: string, values?: Record<string, any>): string => {
      const message =
        messagesMap[state.language][
          key as keyof (typeof messagesMap)[Language]
        ];
      if (!message) return key;

      if (values) {
        return Object.entries(values).reduce(
          (msg, [key, value]) => msg.replace(`{${key}}`, String(value)),
          message as string
        );
      }
      return message as string;
    },
    [state.language]
  );

  const setCurWord = useCallback(
    (word: string | null) => {
      updateState((prev) => ({ ...prev, curWord: word ?? "" }));
    },
    [updateState]
  );

  const clearCurWord = useCallback(() => {
    updateState((prev) => ({ ...prev, curWord: "" }));
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
    availableLanguages: Object.entries(languageNames).map(([code, names]) => ({
      code: code as Language,
      ...names,
    })),
    setCurWord,
    clearCurWord,
    // 新增 modal 控制
    modal: {
      opened,
      toggle,
      open,
      close,
    },
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
