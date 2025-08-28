import React, { useState } from "react";
import { useAutocomplete } from "../hooks/useAutocomplete";
import MultiSourceCombobox from "../components/MultiSourceCombobox";
import GermanWordDisplay from "../components/GermanWordDisplay";
import { useApp } from "../contexts/AppContext";

interface WordData {
  word: string;
  // 其余字段根据后端实际结构补充
  [key: string]: any;
}

const Searching: React.FC = () => {
  const { state } = useApp();
  const [curWordData, setCurWordData] = useState<WordData | null>(null);

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
    try {
      const res = await fetch(
        `https://app.deutik.com/api/word/${encodeURIComponent(lemma)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: WordData = await res.json();
      setCurWordData(data);
    } catch (err) {
      console.error("Failed to fetch word detail:", err);
      setCurWordData(null);
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
        word={curWordData?.word || state.curWord}
        onError={(msg) => console.error(msg)}
      />
    </div>
  );
};

export default Searching;
