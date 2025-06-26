import React, { useState, useEffect, useRef } from "react";
import { Combobox, TextInput, useCombobox, Input } from "@mantine/core";
import type { ComboboxItem } from "@mantine/core";

interface MultiSourceComboboxProps {
  wordLists: string[][];
  maxSuggestions?: number;
  placeholder?: string;
  onSelect?: (word: string) => void;
}

const MultiSourceCombobox: React.FC<MultiSourceComboboxProps> = ({
  wordLists,
  maxSuggestions = 10,
  placeholder = "输入搜索词...",
  onSelect,
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const comboboxRef = useRef(combobox);
  useEffect(() => {
    comboboxRef.current = combobox;
  }, [combobox]);

  const [inputValue, setInputValue] = useState("");
  const [filteredWords, setFilteredWords] = useState<ComboboxItem[]>([]);
  const [activeListIndex, setActiveListIndex] = useState(0);

  const toComboboxItems = (words: string[]): ComboboxItem[] =>
    words.map((word) => ({ value: word, label: word }));

  useEffect(() => {
    const { resetSelectedOption, closeDropdown, openDropdown } =
      comboboxRef.current;

    if (inputValue.length === 0) {
      setFilteredWords([]);
      resetSelectedOption();
      closeDropdown();
      return;
    }

    const lowerInput = inputValue.toLowerCase();
    let results: string[] = [];
    let currentIndex = activeListIndex;

    // 依次搜索各个数组
    for (let i = 0; i < wordLists.length; i++) {
      currentIndex = (activeListIndex + i) % wordLists.length;
      const currentList = wordLists[currentIndex];

      // 修改为 startsWith 匹配单词开头
      results = currentList
        .filter((word) => word.toLowerCase().startsWith(lowerInput))
        .slice(0, maxSuggestions);

      if (results.length > 0) {
        setActiveListIndex(currentIndex);
        break;
      }
    }

    setFilteredWords(toComboboxItems(results));
    if (inputValue.length > 0) {
      openDropdown();
    }
  }, [inputValue, wordLists, activeListIndex, maxSuggestions]);

  const handleOptionSubmit = (value: string) => {
    setInputValue(value);
    onSelect?.(value);
    combobox.closeDropdown();
  };

  return (
    <Combobox
      store={combobox}
      onOptionSubmit={handleOptionSubmit}
      withinPortal={false}
    >
      <Combobox.Target>
        <Input.Wrapper>
          <TextInput
            placeholder={placeholder}
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.currentTarget.value);
              if (event.currentTarget.value.length === 0) {
                setFilteredWords([]);
                combobox.closeDropdown();
              }
            }}
            onClick={() => inputValue.length > 0 && combobox.openDropdown()}
            onFocus={() => inputValue.length > 0 && combobox.openDropdown()}
            onBlur={() => combobox.closeDropdown()}
          />
        </Input.Wrapper>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {filteredWords.length > 0 ? (
            filteredWords.map((item) => (
              <Combobox.Option value={item.value} key={item.value}>
                {item.label}
              </Combobox.Option>
            ))
          ) : (
            <Combobox.Empty>
              {inputValue.length >= 1
                ? activeListIndex === wordLists.length - 1
                  ? "没有找到匹配的单词"
                  : `正在搜索列表 ${activeListIndex + 1}/${wordLists.length}...`
                : "输入搜索词"}
            </Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default MultiSourceCombobox;
