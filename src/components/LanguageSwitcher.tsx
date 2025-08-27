import React from "react";
import { Button, Group, Menu, Avatar } from "@mantine/core";
import { useApp } from "../contexts/AppContext";

const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, setLanguage, availableLanguages } = useApp();

  const getLanguageFlag = (code: string) => {
    const flags = {
      en: "🇺🇸",
      de: "🇩🇪",
      zh: "🇨🇳",
      tr: "🇹🇷",
      ar: "🇸🇦",
    };
    return flags[code as keyof typeof flags] || "🌐";
  };

  return (
    <Menu shadow="md" width={200}>
      <Menu.Target>
        <Button variant="light" size="sm">
          <Avatar size="sm" mr="xs">
            {getLanguageFlag(currentLanguage)}
          </Avatar>
          {currentLanguage.toUpperCase()}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        {availableLanguages.map((lang) => (
          <Menu.Item
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            leftSection={
              <Avatar size="sm">{getLanguageFlag(lang.code)}</Avatar>
            }
          >
            <div>
              <div>{lang.nativeName}</div>
              <div style={{ fontSize: "0.8em", opacity: 0.7 }}>{lang.name}</div>
            </div>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};

export default LanguageSwitcher;
