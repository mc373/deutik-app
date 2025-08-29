import React, { useState } from "react";
import { useAutocomplete } from "../hooks/useAutocomplete";
import MultiSourceCombobox from "../components/MultiSourceCombobox";
import GermanWordDisplay, { WordEntry } from "../components/GermanWordDisplay";
import { useApp } from "../contexts/AppContext";

const Searching: React.FC = () => {
  const { state, setCurWord } = useApp();
  const [wordData, setWordData] = useState<WordEntry | undefined>(undefined); // 改为 undefined

  /* ---------- 远程自动补全 Hook ---------- */
  const {
    inputValue,
    setInputValue,
    suggestions,
    isLoading,
    error,
    clearError,
  } = useAutocomplete("https://app.deutik.com/api/autocomplete");

  /* ---------- 选中词条后拉详情 ---------- */
  const handleSelect = async (lemma: string) => {
    setInputValue(lemma);
    setCurWord(lemma);

    try {
      const res = await fetch(
        `https://app.deutik.com/api/word/${encodeURIComponent(lemma)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: WordEntry = await res.json();
      console.log("Word detail:", data);
    } catch (err) {
      console.error("Failed to fetch word detail:", err);
      setWordData(undefined); // 改为 undefined
    }
  };

  return (
    <div>
      <div style={{ maxWidth: 400, margin: "0 auto", padding: 20 }}>
        <MultiSourceCombobox
          wordLists={[suggestions]}
          loading={isLoading}
          error={error}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onFocus={clearError}
          onSelect={handleSelect}
        />
      </div>

      <GermanWordDisplay
        word={state.curWord}
        onError={(msg) => console.error(msg)}
      />
    </div>
  );
};

export default Searching;
