import {
  AppShell,
  Group,
  ActionIcon,
  Box,
  useMantineColorScheme,
} from "@mantine/core";
import { UserButton, useClerk } from "@clerk/clerk-react";
import { useMemo } from "react";
import {
  IconSun,
  IconMoon,
  IconSearch,
  IconUserFilled,
} from "@tabler/icons-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { GridMenu } from "../components/GridMenu";
import Searching from "./Searching";
import Learning from "./Learning";
// import Unregelverb from "./Unregelverb";
import Vocabulary from "./Vocabulary";
import { useMediaQuery } from "@mantine/hooks";
import { Routes, Route, Navigate } from "react-router-dom";
import Pronunciation from "./Pronunciation";
import { useApp } from "../contexts/AppContext";
import React from "react";
import VerbScrollerWithData from "../components/VerbScrollerWithData";

export default function Home() {
  const { user } = useClerk();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { t, modal } = useApp();
  const isMobile = useMediaQuery("(max-width: 768px)", false);
  const isSmallMobile = useMediaQuery("(max-width: 480px)", false);

  const MemoizedGridMenu = React.memo(GridMenu);
  const MemoizedLearning = React.memo(Learning);
  const MemoizedUnregelverb = React.memo(VerbScrollerWithData);
  const MemoizedVocabulary = React.memo(Vocabulary);
  const MemoizedPronunciation = React.memo(Pronunciation);

  return (
    <AppShell
      header={{ height: isMobile ? 70 : 60 }}
      aside={{
        width: 400,
        breakpoint: "sm",
        collapsed: { mobile: !modal.opened, desktop: false },
      }}
      padding="1px"
    >
      <AppShell.Header
        p={isMobile ? "sm" : "md"}
        bg={colorScheme === "dark" ? "dark.7" : "white"}
        style={{
          borderBottom:
            colorScheme === "dark"
              ? "1px solid var(--mantine-color-dark-4)"
              : "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Group justify="space-between" h="100%" wrap="nowrap" gap="xs">
          {/* 左侧内容 */}
          <Group gap="xs" wrap="nowrap">
            <img
              src={
                colorScheme === "dark"
                  ? isSmallMobile
                    ? "/assets/deutik_d_light.png"
                    : "/assets/deutik_light.png"
                  : isSmallMobile
                  ? "/assets/deutik_d.png"
                  : "/assets/deutik.png"
              }
              alt="Deutik Logo"
              style={{
                width: isSmallMobile ? "20px" : "80px",
                height: isSmallMobile ? "20px" : "20px",
                flexShrink: 0,
              }}
            />

            {isMobile && (
              <ActionIcon
                variant="subtle"
                size={isSmallMobile ? "md" : "lg"}
                onClick={modal.toggle}
                aria-label="查询单词"
                c={colorScheme === "dark" ? "gray.2" : "dark.7"}
                style={{ flexShrink: 0 }}
              >
                <IconSearch size={isSmallMobile ? 16 : 20} />
              </ActionIcon>
            )}
          </Group>

          {/* 右侧内容 */}
          <Group gap={isSmallMobile ? "xs" : "sm"} wrap="nowrap">
            <ActionIcon
              variant="subtle"
              size={isSmallMobile ? "md" : "lg"}
              onClick={toggleColorScheme}
              aria-label="切换主题"
              c={colorScheme === "dark" ? "gray.2" : "dark.7"}
              style={{ flexShrink: 0 }}
            >
              {colorScheme === "dark" ? (
                <IconSun size={isSmallMobile ? 16 : 20} />
              ) : (
                <IconMoon size={isSmallMobile ? 16 : 20} />
              )}
            </ActionIcon>

            <LanguageSwitcher compact={isSmallMobile} />

            {user ? (
              <Box style={{ flexShrink: 0 }}>
                <UserButton />
              </Box>
            ) : (
              <ActionIcon
                variant="filled"
                size={isSmallMobile ? "md" : "lg"}
                onClick={() => {
                  /* 触发登录 */
                }}
                color="blue"
                aria-label={t("app.login") || "Login"}
                style={{ flexShrink: 0 }}
              >
                <IconUserFilled size={isSmallMobile ? 16 : 18} />
              </ActionIcon>
            )}
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main bg={colorScheme === "dark" ? "dark.8" : "gray.0"}>
        <Routes>
          {useMemo(
            () => (
              <>
                <Route path="/" element={<MemoizedGridMenu />} />
                <Route path="/learn" element={<MemoizedLearning />} />
                <Route path="/unregelverb" element={<MemoizedUnregelverb />} />
                <Route path="/vocabulary" element={<MemoizedVocabulary />} />
                <Route
                  path="/pronunciation"
                  element={<MemoizedPronunciation />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            ),
            []
          )}
        </Routes>
      </AppShell.Main>

      <AppShell.Aside
        bg={colorScheme === "dark" ? "dark.7" : "white"}
        style={{
          borderLeft:
            colorScheme === "dark"
              ? "1px solid var(--mantine-color-dark-4)"
              : "1px solid var(--mantine-color-gray-2)",
        }}
      >
        <Box
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Searching />
        </Box>
      </AppShell.Aside>
    </AppShell>
  );
}
