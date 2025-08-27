import { useGlobalState } from "../contexts/GlobalStateContext_bak";
import { resources } from "../locales/types";
import { useMemo } from "react";

export function useTranslation() {
  const {
    state: { language },
  } = useGlobalState();

  return useMemo(
    () => ({
      t: (key: keyof (typeof resources)["en"]) => resources[language][key],
      currentLanguage: language,
    }),
    [language]
  );
}
