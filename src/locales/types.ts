import { useGlobalState } from "../contexts/GlobalStateContext_bak";

// src/locales/types.ts
type TranslationKey =
  | "welcome"
  | "settings.title"
  | "settings.language"
  | "settings.theme";
// 添加更多翻译键...

type Translations = {
  [key in TranslationKey]: string;
};

type LocaleResources = {
  en: Translations;
  de: Translations;
  zh: Translations;
};

// 实现翻译资源
export const resources: LocaleResources = {
  en: {
    welcome: "Welcome to Deutik!",
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.theme": "Theme",
  },
  de: {
    welcome: "Willkommen bei Deutik!",
    "settings.title": "Einstellungen",
    "settings.language": "Sprache",
    "settings.theme": "Thema",
  },
  zh: {
    welcome: "Deutik 欢迎您",
    "settings.title": "设置",
    "settings.language": "语言",
    "settings.theme": "主题",
  },
};

// 类型安全的翻译Hook
export function useTranslations() {
  const {
    state: { language },
  } = useGlobalState();

  return (key: TranslationKey) => {
    return resources[language][key] || key;
  };
}

// types.ts
export type WordLearn = {
  id: string;
  germanWord: string;
  translation: string;
  firstLearnedDate: Date;
  lastReviewedDate: Date;
  nextReviewDate: Date;
  errorCount: number;
  consecutiveCorrect: number;
  familiarity: number;
  isKnown: boolean;
  examples: string[];
  partOfSpeech: string;
  gender?: string;
  tags: string[];
};

export const quizTypes = [
  "translation",
  "spelling",
  "listening",
  "fillBlank",
] as const;
export type QuizType = (typeof quizTypes)[number];
