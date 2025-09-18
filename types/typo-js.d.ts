// typo-js.d.ts
declare module "typo-js" {
  interface Typo {
    constructor(
      lang: string,
      affData: string | false,
      dicData: string,
      options?: { asyncLoad?: boolean; dictionaryPath?: string }
    );
    check(word: string): boolean;
    suggest(word: string): string[];
  }

  const Typo: {
    new (
      lang: string,
      affData: string | false,
      dicData: string,
      options?: { asyncLoad?: boolean; dictionaryPath?: string }
    ): Typo;
  };

  export = Typo;
}
