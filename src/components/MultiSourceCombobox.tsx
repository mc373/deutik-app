import React, { useCallback, useRef, useState, useEffect } from "react";
import { Combobox, TextInput, useCombobox, Input } from "@mantine/core";
import type { ComboboxItem } from "@mantine/core";
import { useApp } from "../contexts/AppContext";

interface MultiSourceComboboxProps {
  wordLists: string[][];
  loading?: boolean;
  error?: string | null;
  inputValue: string;
  onInputChange: (v: string) => void;
  onSelect: (word: string) => void;
  onFocus?: () => void;
  debounceDelay?: number;
}

const MultiSourceCombobox: React.FC<MultiSourceComboboxProps> = ({
  wordLists,
  loading,
  error,
  inputValue, // 来自父组件的值
  onInputChange,
  onSelect,
  onFocus,
  debounceDelay = 800,
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
      // 清除之前的定时器
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // 设置新的定时器
      debounceRef.current = setTimeout(() => {
        onInputChange(value);
      }, debounceDelay);
    },
    [onInputChange, debounceDelay]
  );

  const handleInputChange = (value: string) => {
    // 立即更新本地状态，保持输入框响应性
    setLocalValue(value);

    // 使用防抖触发父组件的回调
    debouncedInputChange(value);

    // 输入时自动打开下拉框
    if (value.length > 0) {
      combobox.openDropdown();
    } else {
      combobox.closeDropdown();
    }
  };

  const handleBlur = () => {
    // 清除防抖定时器
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    // 确保本地状态与父组件状态同步
    if (localValue !== inputValue) {
      setLocalValue(inputValue);
    }

    setTimeout(() => combobox.closeDropdown(), 150);
  };

  const handleOptionSelect = (val: string) => {
    onSelect(val);
    combobox.closeDropdown();

    // 清除防抖定时器
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  };

  const suggestions: ComboboxItem[] = wordLists
    .flat()
    .map((w) => ({ value: w, label: w }));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={handleOptionSelect}
    >
      <Combobox.Target>
        <Input.Wrapper>
          <TextInput
            placeholder={t("app.inputword")}
            value={localValue} // 使用本地状态
            onChange={(e) => handleInputChange(e.currentTarget.value)}
            onFocus={() => {
              if (localValue.length > 0) combobox.openDropdown();
              onFocus?.();
            }}
            onBlur={handleBlur}
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
          ) : localValue.length > 0 ? ( // 使用本地状态判断
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
