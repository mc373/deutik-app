import React from "react";
import { useAutocomplete } from "../hooks/useAutocomplete";
import MultiSourceCombobox from "../components/MultiSourceCombobox";
import GermanWordDisplay from "../components/GermanWordDisplay";
import { useApp } from "../contexts/AppContext";

const Searching: React.FC = () => {
  const { state, setCurWord } = useApp();

  /* ---------- 远程自动补全 Hook ---------- */
  const {
    inputValue,
    setInputValue,
    langValue,
    setLanguageChange,
    suggestions,
    rawSuggestions,
    isLoading,
    error,
    clearError,
  } = useAutocomplete();

  /* ---------- 选中词条后拉详情 ---------- */
  const handleSelect = async (lemma: string, rawData?: any) => {
    setInputValue(lemma);

    // 如果是从其他语言选择的，使用原始数据中的德语单词
    const germanWord = rawData?.lemma || lemma;
    setCurWord(germanWord);
  };

  return (
    <div>
      <div
        style={{
          maxWidth: 400,
          margin: "0 auto",
          padding: "20px 25px 20px 12px",
        }}
      >
        <MultiSourceCombobox
          wordLists={[suggestions]}
          rawWordData={[rawSuggestions]} // 传递原始数据
          loading={isLoading}
          error={error}
          inputValue={inputValue}
          onInputChange={setInputValue}
          selectedLanguage={langValue}
          onLanguageChange={setLanguageChange}
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
