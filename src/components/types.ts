// types.ts
export interface TranslationSet {
  ar?: string;
  de: string;
  en: string;
  tr?: string;
  zh?: string;
  [key: string]: string | undefined; // 允许其他语言
}

export interface WordMeaning {
  focus: TranslationSet;
  score: number;
  examples: TranslationSet;
  definitions: TranslationSet;
}

export interface CommonPhrase {
  [language: string]: string;
}

export interface CulturalUsage {
  [language: string]: string;
}

export interface WordEntry {
  lemma: string;
  word: string;
  pronunciation?: string;
  category?: string;
  importance?: string | null;
  frequency?: number;
  meanings: WordMeaning[];
  common_phrases: CommonPhrase[];
  cultural_usage?: CulturalUsage;
}
