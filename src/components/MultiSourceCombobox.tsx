import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Combobox,
  TextInput,
  useCombobox,
  Input,
  ActionIcon,
  Button,
} from "@mantine/core";
import type { ComboboxItem } from "@mantine/core";
import { useApp } from "../contexts/AppContext";
import { IconLanguage } from "@tabler/icons-react";

interface MultiSourceComboboxProps {
  wordLists: string[][];
  rawWordData?: any[][];
  loading?: boolean;
  error?: string | null;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSelect: (word: string, rawData?: any) => void;
  onFocus?: () => void;
  onLanguageChange?: (lang: string) => void;
  debounceDelay?: number;
  selectedLanguage?: string;
  detectedLanguage?: string;
}

const getLanguageName = (code: string): string => {
  const names: { [key: string]: string } = {
    de: "Deutsch",
    en: "English",
    zh: "中文",
    tr: "Türkçe",
    ar: "العربية",
  };
  return names[code] || code;
};

// 检测输入文本的语言
const detectLanguage = (text: string): string => {
  if (!text.trim()) return "de"; // 默认为德语

  // 检查是否包含中文字符
  const chineseRegex = /[\u4e00-\u9fff]/;
  if (chineseRegex.test(text)) return "zh";

  // 检查是否包含阿拉伯字符
  const arabicRegex = /[\u0600-\u06FF]/;
  if (arabicRegex.test(text)) return "ar";

  // 检查是否包含土耳其语特殊字符
  const turkishRegex = /[ğĞıİşŞçÇöÖüÜ]/;
  if (turkishRegex.test(text)) return "tr";

  // 默认使用拉丁字母的语言（德语或英语）
  // const latinRegex = /^[a-zA-ZäöüÄÖÜß\s]+$/;
  // if (latinRegex.test(text)) {
  //   // 简单的启发式规则：如果包含德语特殊字符或常见德语单词模式，判断为德语
  //   //const germanIndicators = /[äöüÄÖÜß]|(sch|ch|ei|ie|eu|äu)/i;
  //   //return germanIndicators.test(text) ? "de" : "en";

  // }

  return "de"; // 默认回退到德语
};

const MultiSourceCombobox: React.FC<MultiSourceComboboxProps> = ({
  wordLists,
  rawWordData = [],
  inputValue,
  onInputChange,
  onSelect,
  onFocus,
  onLanguageChange,
  selectedLanguage = "de",
  debounceDelay = 500,
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { t } = useApp();

  const [localValue, setLocalValue] = useState(inputValue);
  const [autoDetectedLanguage, setAutoDetectedLanguage] = useState("de");
  const [userSelectedLanguage, setUserSelectedLanguage] = useState<
    string | null
  >(null);

  // 计算最终使用的语言

  useEffect(() => {
    setLocalValue(inputValue);

    // 自动检测语言
    const detected = detectLanguage(inputValue);

    setAutoDetectedLanguage(detected);

    // 如果用户没有手动选择语言，或者输入被清空，重置用户选择
    if (inputValue.trim() === "" && userSelectedLanguage) {
      setUserSelectedLanguage(null);
    }
  }, [inputValue, userSelectedLanguage]);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
    onLanguageChange?.(detectLanguage(inputValue));

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

  const changeToEN = () => {
    // setUserSelectedLanguage(lang);
    if (onLanguageChange) {
      onLanguageChange("en");
    }
  };

  const resetLanguageSelection = () => {
    setUserSelectedLanguage(null);
    if (onLanguageChange) {
      onLanguageChange(autoDetectedLanguage);
    }
  };

  const suggestions: ComboboxItem[] = wordLists.flat().map((w) => ({
    value: w,
    label: w,
  }));

  const showLanguageToggle = userSelectedLanguage !== null;

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
            styles={{
              input: {
                paddingRight: showLanguageToggle ? 130 : 50,
              },
            }}
          />
        </Input.Wrapper>
      </Combobox.Target>

      <Combobox.Dropdown style={{ maxHeight: 300, overflowY: "scroll" }}>
        <div
          style={{
            padding: "8px 12px",
            fontSize: "12px",
            color: "#666",
            borderBottom: "1px solid #eee",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            搜索语言: {getLanguageName(selectedLanguage)}
            {selectedLanguage === "de" && (
              <Button onClick={changeToEN}>en</Button>
            )}
            {selectedLanguage === "en" && <Button>de</Button>}
          </span>
          {userSelectedLanguage && (
            <ActionIcon
              size="xs"
              variant="subtle"
              color="blue"
              onClick={resetLanguageSelection}
              title="重置为自动检测"
            >
              <IconLanguage size={14} />
            </ActionIcon>
          )}
        </div>
        <Combobox.Options>
          {suggestions
            .sort((a, b) => a.label.localeCompare(b.label, "de"))
            .map((item) => (
              <Combobox.Option key={item.value} value={item.value}>
                {item.label}
              </Combobox.Option>
            ))}
        </Combobox.Options>
      </Combobox.Dropdown>
    </Combobox>
  );
};

export default MultiSourceCombobox;
