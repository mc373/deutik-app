import React from "react";
import { Combobox, TextInput, useCombobox, Input } from "@mantine/core";
import type { ComboboxItem } from "@mantine/core";
import { useApp } from "../contexts/AppContext";

interface MultiSourceComboboxProps {
  // 由父组件直接传已过滤好的单词数组
  wordLists: string[][];
  loading?: boolean;
  error?: string | null;
  // 完全受控
  inputValue: string;
  onInputChange: (v: string) => void;
  onSelect: (word: string) => void;
  onFocus?: () => void;
}

const MultiSourceCombobox: React.FC<MultiSourceComboboxProps> = ({
  wordLists,
  loading,
  error,
  inputValue,
  onInputChange,
  onSelect,
  onFocus,
}) => {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });
  const { t } = useApp();

  // 远程只给了一个数组，直接拍平即可
  const suggestions: ComboboxItem[] = wordLists
    .flat()
    .map((w) => ({ value: w, label: w }));

  return (
    <Combobox
      store={combobox}
      withinPortal={false}
      onOptionSubmit={(val) => {
        onSelect(val);
        combobox.closeDropdown();
      }}
    >
      <Combobox.Target>
        <Input.Wrapper>
          <TextInput
            placeholder={t("app.inputword")}
            value={inputValue}
            onChange={(e) => onInputChange(e.currentTarget.value)}
            onFocus={() => {
              if (inputValue.length > 0) combobox.openDropdown();
              onFocus?.();
            }}
            onBlur={() => setTimeout(combobox.closeDropdown, 150)}
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
          ) : inputValue.length > 0 ? (
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
