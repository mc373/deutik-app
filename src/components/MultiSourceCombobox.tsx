import React, { useCallback, useRef, useState, useEffect } from "react";
import { Combobox, TextInput, useCombobox, Input, Select } from "@mantine/core";
import type { ComboboxItem } from "@mantine/core";
import { useApp } from "../contexts/AppContext";

interface MultiSourceComboboxProps {
  wordLists: string[][];
  rawWordData?: any[][]; // 新增：原始单词数据
  loading?: boolean;
  error?: string | null;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSelect: (word: string, rawData?: any) => void; // 修改：增加原始数据参数
  onFocus?: () => void;
  onLanguageChange?: (lang: string) => void;
  debounceDelay?: number;
  selectedLanguage?: string;
}

const languageOptions = [
  { value: "de", label: "DE" },
  { value: "en", label: "EN" },
  { value: "zh", label: "中文" },
  { value: "tr", label: "TR" },
  { value: "ar", label: "AR" },
];

const MultiSourceCombobox: React.FC<MultiSourceComboboxProps> = ({
  wordLists,
  rawWordData = [],
  loading,
  error,
  inputValue,
  onInputChange,
  onSelect,
  onFocus,
  onLanguageChange,
  debounceDelay = 800,
  selectedLanguage = "de",
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { t } = useApp();

  // 使用本地状态来保持输入框的响应性
  const [localValue, setLocalValue] = useState(inputValue);

  // 当父组件的inputValue变化时（比如选中选项后清空），同步到本地
  useEffect(() => {
    setLocalValue(inputValue);
  }, [inputValue]);

  // 使用 useRef 来存储防抖定时器
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // 防抖处理函数
  const debouncedInputChange = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        onInputChange(value);
      }, debounceDelay);
    },
    [onInputChange, debounceDelay]
  );

  const handleInputChange = (value: string) => {
    setLocalValue(value);
    debouncedInputChange(value);

    if (value.length > 0) {
      combobox.openDropdown();
    } else {
      combobox.closeDropdown();
    }
  };

  const handleBlur = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (localValue !== inputValue) {
      setLocalValue(inputValue);
    }

    setTimeout(() => combobox.closeDropdown(), 150);
  };

  const handleOptionSelect = (val: string) => {
    // 查找对应的原始数据
    const flatRawData = rawWordData.flat();
    const selectedRawData = flatRawData.find(
      (item: any) =>
        item.lemma === val || `${item.lemma} - ${item.meaning}` === val
    );

    onSelect(val, selectedRawData);
    combobox.closeDropdown();

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const handleLanguageChange = (lang: string | null) => {
    if (lang && onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  const suggestions: ComboboxItem[] = wordLists.flat().map((w, index) => ({
    value: w,
    label: w,
  }));

  return (
    <Combobox store={combobox} onOptionSubmit={handleOptionSelect}>
      <Combobox.Target>
        <Input.Wrapper>
          <TextInput
            placeholder={t("app.inputword")}
            value={localValue}
            onChange={(e) => handleInputChange(e.currentTarget.value)}
            onFocus={() => {
              if (localValue.length > 0) combobox.openDropdown();
              onFocus?.();
            }}
            onBlur={handleBlur}
            rightSectionWidth={70}
            rightSection={
              <Select
                data={languageOptions}
                value={selectedLanguage}
                onChange={handleLanguageChange}
                size="xs"
                variant="unstyled"
                style={{ width: 60 }}
                comboboxProps={{
                  position: "bottom",
                  middlewares: { flip: false, shift: false },
                  offset: 0,
                  withinPortal: true,
                }}
                styles={{
                  input: {
                    padding: "0 5px",
                    fontWeight: 600,
                    fontSize: "12px",
                    border: "none",
                    background: "transparent",
                    textAlign: "center",
                  },
                  dropdown: {
                    minWidth: "80px",
                  },
                  option: {
                    fontSize: "12px",
                    padding: "4px 8px",
                    textAlign: "center",
                  },
                }}
              />
            }
            styles={{
              input: {
                paddingRight: 80,
              },
            }}
          />
        </Input.Wrapper>
      </Combobox.Target>

      <Combobox.Dropdown>
        <Combobox.Options>
          {loading ? (
            <Combobox.Empty>{t("app.loading")}</Combobox.Empty>
          ) : error ? (
            <Combobox.Empty>{error}</Combobox.Empty>
          ) : suggestions.length ? (
            suggestions.map((item) => (
              <Combobox.Option key={item.value} value={item.value}>
                {item.label}
              </Combobox.Option>
            ))
          ) : localValue.length > 0 ? (
            <Combobox.Empty>{t("app.wordnomatch")}</Combobox.Empty>
          ) : (
            <Combobox.Empty>{t("app.inputword")}</Combobox.Empty>
          )}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default MultiSourceCombobox;
