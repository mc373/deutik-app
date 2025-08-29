import React from "react";
import { ActionIcon, Menu, Text, Group } from "@mantine/core";
import { useApp } from "../contexts/AppContext";
import { IconChevronDown } from "@tabler/icons-react";
import { useMediaQuery } from "@mantine/hooks";

interface LanguageSwitcherProps {
  compact?: boolean;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  compact = false,
}) => {
  const { currentLanguage, setLanguage, availableLanguages, t } = useApp();
  const isMobile = useMediaQuery("(max-width: 768px)");

  // 获取当前语言的完整信息
  const currentLangInfo = availableLanguages.find(
    (lang) => lang.code === currentLanguage
  );

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

  // 在移动设备上，将下拉菜单位置调整为左侧
  const menuPosition = isMobile ? "bottom-start" : "bottom-end";

  if (compact) {
    return (
      <Menu
        shadow="md"
        width={140}
        position={menuPosition}
        withinPortal={true} // 确保在下拉菜单中使用 portal
        zIndex={10000} // 设置较高的 z-index
      >
        <Menu.Target>
          <ActionIcon
            variant="subtle"
            size="md"
            aria-label={t("app.changeLanguage") || "Change language"}
          >
            <Text fw={500} size="sm">
              {getLanguageFlag(currentLanguage)}
            </Text>
          </ActionIcon>
        </Menu.Target>

        <Menu.Dropdown style={{ zIndex: 10001 }}>
          {availableLanguages.map((lang) => (
            <Menu.Item
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              style={{
                padding: "8px 12px",
                fontWeight: currentLanguage === lang.code ? 600 : 400,
              }}
            >
              <Group gap="sm">
                <Text size="sm">{getLanguageFlag(lang.code)}</Text>
                <Text size="sm">{lang.nativeName}</Text>
              </Group>
            </Menu.Item>
          ))}
        </Menu.Dropdown>
      </Menu>
    );
  }

  return (
    <Menu
      shadow="md"
      width={160}
      position={menuPosition}
      withinPortal={true} // 确保在下拉菜单中使用 portal
      zIndex={10000} // 设置较高的 z-index
    >
      <Menu.Target>
        <ActionIcon
          variant="light"
          size="lg"
          aria-label={t("app.changeLanguage") || "Change language"}
          style={{ borderRadius: "20px", padding: "0 8px" }}
        >
          <Group gap="xs">
            <Text fw={500} size="sm">
              {getLanguageFlag(currentLanguage)}
            </Text>
            <Text fw={500} size="sm">
              {currentLangInfo?.nativeName || currentLanguage.toUpperCase()}
            </Text>
            <IconChevronDown size={14} />
          </Group>
        </ActionIcon>
      </Menu.Target>

      <Menu.Dropdown style={{ zIndex: 10001 }}>
        {availableLanguages.map((lang) => (
          <Menu.Item
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            style={{
              padding: "10px 12px",
              fontWeight: currentLanguage === lang.code ? 600 : 400,
              backgroundColor:
                currentLanguage === lang.code
                  ? "var(--mantine-color-blue-light)"
                  : "transparent",
            }}
          >
            <Group gap="sm">
              <Text size="sm" style={{ minWidth: "20px" }}>
                {getLanguageFlag(lang.code)}
              </Text>
              <div>
                <Text size="sm" fw={currentLanguage === lang.code ? 600 : 400}>
                  {lang.nativeName}
                </Text>
                <Text size="xs" c="dimmed">
                  {lang.name}
                </Text>
              </div>
            </Group>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
};

export default LanguageSwitcher;
